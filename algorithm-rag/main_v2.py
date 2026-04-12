import hashlib
import time
import uuid
import mysql.connector
import json

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.responses import StreamingResponse
import uvicorn
from openai import OpenAI
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer
import chromadb
from dotenv import load_dotenv, find_dotenv
import os
import shutil

from starlette.responses import JSONResponse, FileResponse

from typing import Optional, List, Any
from typing_extensions import TypedDict
from pydantic import BaseModel


class ChatMessage(TypedDict, total=False):
    extra: Any
    sender: int
    status: int
    content: str


class UploadFileRequest(BaseModel):
    collection_id: str
    user: str


class QueryRequest(BaseModel):
    query: str
    model: str
    collection_id: str
    chat_history: Optional[List[ChatMessage]] = None


class AddRequest(BaseModel):
    content: str
    document_id: str
    collection_id: str
    user: str


class UpdateRequest(BaseModel):
    id: str
    content: str
    document_id: str
    collection_id: str
    user: str


class DeleteRequest(BaseModel):
    id: str
    collection_id: str
    document_id: str


class RecallRequest(BaseModel):
    query: str
    collection_id: str
    top_n: int = 10


# 加载环境变量
_ = load_dotenv(find_dotenv())
base_url = os.environ.get("OPENAI_API_BASE")
api_key = os.environ.get("OPENAI_API_KEY")
db_host = os.environ.get("DB_HOST")
db_username = os.environ.get("DB_USER")
db_password = os.environ.get("DB_PWD")
db_name = os.environ.get("DB_NAME")

app = FastAPI()
client = OpenAI(api_key=api_key, base_url=base_url)


# 封装 OpenAI 的 Embedding 模型接口
def get_embeddings(texts, model="text-embedding-3-small"):
    data = client.embeddings.create(input=texts, model=model).data
    return [x.embedding for x in data]


# PDF 文件加载器
class PDFFileLoader:
    def __init__(self, file_path: str):
        self.paragraphs = self.extract_text_from_pdf(file_path)

    def get_paragraphs(self):
        return self.paragraphs

    def extract_text_from_pdf(self, filename, page_numbers=None):
        paragraphs = []
        buffer = ''
        full_text = ''
        for i, page_layout in enumerate(extract_pages(filename)):
            if page_numbers is not None and i not in page_numbers:
                continue
            for element in page_layout:
                if isinstance(element, LTTextContainer):
                    full_text += element.get_text() + '\n'

        lines = full_text.split('。')

        for text in lines:
            buffer = text.replace('\n', ' ').replace(' ', '')
            if buffer:
                paragraphs.append(buffer)
                buffer = ''
        if buffer:
            paragraphs.append(buffer)
        return list(set(paragraphs))


# MySQL数据库连接器
class MySQLConnector:
    def __init__(self, host, user, password, database=None, port=3306):
        self.conn = mysql.connector.connect(
            host=host,
            user=user,
            password=password,
            database=database,
            port=port
        )
        self.cursor = self.conn.cursor()

    def query(self, sql, params=None):
        """执行查询语句，返回所有查询结果"""
        self.cursor.execute(sql, params or ())
        return self.cursor.fetchall()

    def execute(self, sql, params=None):
        """执行插入/更新/删除等DML语句"""
        self.cursor.execute(sql, params or ())
        self.conn.commit()

    def close(self):
        """关闭游标和连接"""
        self.cursor.close()
        self.conn.close()


# MySQL数据库实例
# mysql_db = MySQLConnector(host=db_host, user=db_username, password=db_password, database=db_name)


class MyVectorDBConnector:
    def __init__(self, collection_id, embedding_fn):
        chroma_client = chromadb.PersistentClient(path=f"./chromaDB/{collection_id}")
        self.collection = chroma_client.get_or_create_collection(name=collection_id)
        self.embedding_fn = embedding_fn

    # 批量embedding并新增分段
    def add_chunk(self, documents, document_id, user):
        # Mysql 实例
        mysql_db = MySQLConnector(host=db_host, user=db_username, password=db_password, database=db_name)
        ids = [f"{uuid.uuid4()}" for i in range(len(documents))]
        embeddings = self.embedding_fn(documents)

        # 拼接 documents 和 ids
        documents_array = [
            {"id": id_, "content": doc}
            for id_, doc in zip(ids, documents)
        ]
        # 1.将记录同步插入到 MySQL 数据库
        for doc in documents_array:
            row_sql = (
                f"INSERT INTO `{document_id}` "
                "(id, content, create_by, create_time, update_time) VALUES (%s, %s, %s, NOW(), NOW())"
            )
            mysql_db.execute(row_sql, (doc['id'], doc['content'], user))
        mysql_db.close()
        # 2.将文档添加到向量数据库
        self.collection.add(
            embeddings=embeddings,
            documents=documents,
            ids=ids
        )

        return ids

    # 更新embedding后的分段内容
    def update_chunk(self, update_body):
        # Mysql 实例
        mysql_db = MySQLConnector(host=db_host, user=db_username, password=db_password, database=db_name)
        id_ = update_body.id
        content = update_body.content
        document_id = update_body.document_id
        user = update_body.user
        # 1. 将MySQL数据库中的记录更新
        update_sql = (
            f"UPDATE `{document_id}` "
            "SET content = %s, create_by = %s, update_time = NOW() "
            "WHERE id = %s"
        )
        mysql_db.execute(update_sql, (content, user, id_))
        mysql_db.close()
        # 2. 将向量数据库中的记录更新
        embeddings = self.embedding_fn([content])
        documents = [content]
        self.collection.upsert(
            ids=[id_],
            documents=documents,
            embeddings=embeddings
        )

    # 根据 id 删除分段（支持传入数组）
    def delete_chunk(self, id_, document_id):
        # Mysql 实例
        mysql_db = MySQLConnector(host=db_host, user=db_username, password=db_password, database=db_name)

        ids = id_ if isinstance(id_, list) else [id_]
        if not ids:  # 如果为空
            mysql_db.close()
            return
        self.collection.delete(ids=ids)

        # 批量构建删除 SQL
        placeholders = ','.join(['%s'] * len(ids))
        sql = f"DELETE FROM `{document_id}` WHERE id IN ({placeholders})"
        mysql_db.execute(sql, tuple(ids))
        mysql_db.close()

    # 向量搜索
    def search(self, query, top_n):
        return self.collection.query(
            query_embeddings=self.embedding_fn([query]),
            n_results=top_n
        )


@app.middleware("http")
async def ignore_well_known_requests(request: Request, call_next):
    if request.url.path.startswith("/.well-known"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    response = await call_next(request)
    return response


@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/download_document")
async def download_document(collection_id: str, file_hash: str):
    if not collection_id:
        raise HTTPException(status_code=400, detail="缺少collection_id参数")
    if not file_hash:
        raise HTTPException(status_code=400, detail="缺少file_hash参数")

    # Basic path traversal protection.
    if any(x in file_hash for x in ["..", "/", "\\"]):
        raise HTTPException(status_code=400, detail="file_hash 非法")
    if not file_hash.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="仅支持 PDF 预览")

    base_dir = os.path.abspath(os.path.join(".", "files", collection_id))
    file_path = os.path.abspath(os.path.join(base_dir, file_hash))
    if not file_path.startswith(base_dir + os.sep):
        raise HTTPException(status_code=400, detail="文件路径非法")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")

    return FileResponse(file_path, media_type="application/pdf", headers={"Cache-Control": "no-store"})


# 上传文档并新增分段
@app.post("/upload")
async def upload_and_embed_file(
    collection_id: str = Form(...),
    user: str = Form(...),
    file_name: str = Form(...),
    file: UploadFile = File(...)
):
    if not collection_id:
        raise HTTPException(status_code=400, detail="collection_id 不能为空")
    if not user:
        raise HTTPException(status_code=400, detail="user 不能为空")
    if not file:
        raise HTTPException(status_code=400, detail="请上传文件")
    vector_db = MyVectorDBConnector(collection_id, get_embeddings)
    try:
        # 创建上传目录
        upload_dir = f"./files/{collection_id}"
        os.makedirs(upload_dir, exist_ok=True)

        # 生成唯一文件名
        file_name = file_name if file_name else file.filename.split('.')[0]
        file_ext = os.path.splitext(file.filename)[1]

        # 读取文件内容并计算哈希
        file_content = await file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        new_file_hash = f"{collection_id}_{file_hash[:6]}"
        unique_filename = f"{file_hash}{file_ext}"

        # 重置文件指针位置
        await file.seek(0)
        file_path = os.path.join(upload_dir, unique_filename)

        # 检查文件是否已存在
        if os.path.exists(file_path):
            return {
                "status": "success",
                "message": "文件已存在",
                "file_id": new_file_hash
            }

        # 保存文件
        with open(file_path, "wb") as f:
            while content := await file.read(1024 * 1024):  # 分块读取，每块1MB
                f.write(content)

        # 处理PDF文件并生成embedding
        try:
            pdf_loader = PDFFileLoader(file_path)
            paragraphs = pdf_loader.get_paragraphs()
            if not paragraphs:
                os.remove(file_path)
                raise HTTPException(status_code=400, detail="PDF文件内容为空")
            # Mysql 实例
            mysql_db = MySQLConnector(host=db_host, user=db_username, password=db_password, database=db_name)
            # 1. 将 new_file_hash 插入到 documents 表中
            mysql_db.execute("INSERT INTO documents "
                             "(id, file_name, file_hash, collection_id, create_by, create_time, update_time) "
                             "VALUES (%s, %s, %s, %s, %s, NOW(), NOW())",
                             (new_file_hash, file_name, unique_filename, collection_id, user))

            # 2.将 collection 信息同步添加到 Mysql 数据库
            # 判断当前 collection_id 是否存在
            collections = mysql_db.query("SELECT * FROM collections WHERE id = %s", (collection_id,))
            # 2.1. 如果存在，则只修改 update_time
            if len(collections) > 0:
                mysql_db.execute("UPDATE collections SET update_time = NOW() WHERE id = %s", (collection_id,))
            # 2.22. 如果不存在，报错
            else:
                raise HTTPException(status_code=400, detail="collection_id 不存在")

            # 3. 创建 new_file_hash 对应的表
            table_name = new_file_hash
            create_table_sql = f"""
            CREATE TABLE IF NOT EXISTS `{new_file_hash}` (
                id VARCHAR(255) PRIMARY KEY,
                content TEXT,
                create_by VARCHAR(255),
                create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """

            mysql_db.execute(create_table_sql)
            vector_db.add_chunk(paragraphs, table_name, user)

            mysql_db.close()
            return {
                "status": "success",
                "message": "文件上传并处理成功",
                "file_id": new_file_hash,
                "file_hash": unique_filename,
                "paragraph_count": len(paragraphs)
            }
        except Exception as e:
            os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"文件处理失败: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"上传失败: {str(e)}")


# 新增一个分段
@app.post('/add_chunk')
async def add_document(request: AddRequest):
    collection_id = request.collection_id
    if not collection_id:
        collection_id = "013573a2_agriculture"
    vector_db = MyVectorDBConnector(collection_id, get_embeddings)
    try:
        ids = vector_db.add_chunk([request.content], request.document_id, request.user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加失败: {str(e)}")
    return {
        "status": "ok",
        "message": "添加成功",
        "data": {
            "id": ids[0]
        }
    }


# 更新分段内容
@app.post('/update_chunk')
async def update_chunk(request: UpdateRequest):
    collection_id = request.collection_id
    if not collection_id:
        collection_id = "013573a2_agriculture"
    vector_db = MyVectorDBConnector(collection_id, get_embeddings)
    try:
        vector_db.update_chunk(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新失败: {str(e)}")
    return {
        "status": "ok",
        "message": "更新成功",
        "data": {
            "id": request.id,
            "content": request.content
        }
    }


# 删除某个分段
@app.post("/delete_chunk")
async def delete_chunk(request: DeleteRequest):
    id_ = request.id
    collection_id = request.collection_id
    document_id = request.document_id
    if not collection_id or not id_ or not document_id:
        raise HTTPException(status_code=400, detail="缺少必要参数")
    vector_db = MyVectorDBConnector(collection_id, get_embeddings)
    try:
        vector_db.delete_chunk(id_, document_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")
    return {
        "status": "ok",
        "message": "删除成功",
        "data": {
            "id": id_,
            "document_id": document_id,
            "collection_id": collection_id
        }
    }


# 删除某个文档
@app.post("/delete_document")
async def delete_document(collection_id: str, document_id: str, file_hash: str):
    if not document_id or not collection_id:
        raise HTTPException(status_code=400, detail="缺少必要参数")
    vector_db = MyVectorDBConnector(collection_id, get_embeddings)
    mysql_db = MySQLConnector(host=db_host, user=db_username, password=db_password, database=db_name)
    try:
        chunk_ids = mysql_db.query(f"SELECT id FROM `{document_id}`")
        chunk_ids = [item[0] for item in chunk_ids]
        vector_db.delete_chunk(chunk_ids, document_id)
        if os.path.exists(f"./files/{collection_id}/{file_hash}"):
            os.system(f"rm -rf ./files/{collection_id}/{file_hash}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")
    return {
        "status": "ok",
        "message": "删除成功",
        "data": {
            "table_name": document_id,
            "collection_id": collection_id
        }
    }


# 删除某个库
@app.post("/delete_collection")
async def delete_collection(collection_id: str):
    if not collection_id:
        raise HTTPException(status_code=400, detail="缺少必要参数")
    # 判断向量库路径是否存在
    if not os.path.exists(f"./chromaDB/{collection_id}"):
        raise HTTPException(404, detail="向量库不存在")
    try:
        os.system(f"rm -rf ./chromaDB/{collection_id}")
        # 判断向量库存放文件路径是否存在
        if os.path.exists(f"./files/{collection_id}"):
            os.system(f"rm -rf ./files/{collection_id}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除向量库失败: {str(e.detail)}")
    return {
        "status": "ok",
        "message": "删除向量库成功",
        "data": {
            "id": collection_id
        }
    }


# 语音识别
@app.post("/speech")
async def speech(model: str = Form(...), file: UploadFile = File(...)):
    if not model:
        model = "whisper-1"
    # 保存到本地临时文件
    file_path = f"./files/audio/{file.filename}"
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 再用 SDK 做识别
    with open(file_path, "rb") as audio_file:
        try:
            transcript = client.audio.transcriptions.create(
                file=audio_file,
                model=model
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"语音识别失败: {str(e)}")

    return {"text": transcript.text}


# 召回分段
@app.post("/recall")
async def recall_chunks(request: RecallRequest):
    collection_id = request.collection_id
    query = request.query
    top_n = request.top_n or 10

    if not collection_id:
        raise HTTPException(status_code=400, detail="缺少collection_id参数")
    if not query:
        raise HTTPException(status_code=400, detail="缺少query参数")

    vector_db = MyVectorDBConnector(collection_id, get_embeddings)
    results = vector_db.search(query, top_n)

    ids = results.get('ids', [[]])
    documents = results.get('documents', [[]])
    distances = results.get('distances', [[]])

    items = []
    if ids and documents and len(ids) > 0 and len(documents) > 0:
        for index, content in enumerate(documents[0]):
            item = {
                "id": ids[0][index],
                "content": content,
            }
            if distances and len(distances) > 0 and len(distances[0]) > index:
                distance = distances[0][index]
                item["distance"] = distance
                # 将距离转换为 0-1 匹配度
                try:
                    item["score"] = 1 / (1 + float(distance))
                except Exception:
                    pass
            items.append(item)

    return {"items": items}


# 查询并生成回答
@app.post("/completion")
async def create_completion(request: QueryRequest):
    collection_id = request.collection_id
    # 构建聊天历史字符串
    chat_history = []
    if request.chat_history and isinstance(request.chat_history, list):
        print(request.chat_history)
        for chat in request.chat_history:
            chat_history.append(f"{'问' if chat['sender'] else '答'}：{chat['content']}")
    chat_history = '\n'.join(chat_history)

    if not collection_id:
        collection_id = "test"
    vector_db = MyVectorDBConnector(collection_id, get_embeddings)
    try:
        query = request.query
        model = request.model
        if not model:
            model = "gpt-3.5-turbo-1106"
        if not query:
            raise HTTPException(status_code=400, detail="缺少query参数")

        # 查询向量数据库
        results = vector_db.search(query, 5)
        if not results['documents']:
            raise HTTPException(status_code=404, detail="未找到相关分段")

        # 构建提示词模板
        system_prompt = """
        你是一个湖北省农技知识问答机器人。
        你的任务是根据下述给定的已知知识与对话历史回答用户问题。
        你的回复可以依据下述已知信息。如知识无法解决，请说“我不知道”，不要编造答案。
        你的回复对象主要是农户，需要使用通俗易懂的语言进行回答，避免过于专业化的术语。
        当用户提出的问题为非湖北省农技相关问题时，请直接回答“很抱歉，我目前只能回答湖北省农技相关问题”。
        请用中文回答用户问题，如果无法从已知信息中直接找到答案，可以基于你训练的数据中回答该问题。
        如果用户表述不明确或是有歧义，可以尝试询问用户是否需要进一步解释，或者提示用户提供更多信息。
        当用户询问的内容明确，但已有知识库或者已知信息中无法对问题进行回答，请直接回答“很抱歉，我目前还无法回答您提出的问题”。
        """

        # 查到的相关分段
        info = results['documents'][0]
        if isinstance(info, list):  # 如果是 list 则进行合并
            info_text = "\n".join(info)
        else:
            info_text = info

        message = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"""
【已知知识】:
{info_text}

【对话历史】：
{chat_history}

【用户问题】：
{query}
"""
             }
        ]
        print(message)

        # 生成响应
        async def generate():
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=message,
                    temperature=0.3,  # 适当增加温度值使回答更自然
                    stream=True
                )
                for chunk in response:
                    # 适配openai官方的python库结构
                    if hasattr(chunk, "model_dump"):
                        chunk_json = chunk.model_dump()
                    else:
                        # chunk为dict 或其他兼容结构
                        chunk_json = chunk

                    # OpenAI官方若finish_reason是stop依然会返回最后一条
                    # 建议全返回不跳过，也可按需过滤
                    data_str = f"data: {json.dumps(chunk_json, ensure_ascii=False)}\n\n"
                    yield data_str
                yield "data: [DONE]\n\n"
            except Exception as e:
                error_data = {"error": str(e)}
                yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
            # except Exception as e:
            #     yield f"生成回答时出错: {str(e)}"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "X-Request-ID": str(uuid.uuid4()),
                "Cache-Control": "no-cache"
            }
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理请求失败: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8001)
