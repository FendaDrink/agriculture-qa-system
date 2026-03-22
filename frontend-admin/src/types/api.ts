export interface AuthTokenPayload {
  userId: string
  username: string
  roleId: number
  exp?: number
  iat?: number
}

export interface AuthUser {
  userId: string
  username: string
  roleId: number
  token: string
}

export interface UserDto {
  id: string
  username: string
  roleId: number
  status: number
  createTime: string
  updateTime: string
}

export interface CollectionDto {
  id: string
  collectionName: string
  createBy: string
  createTime: string
  updateTime: string
}

export interface DocumentDto {
  id: string
  fileName: string
  fileHash: string
  collectionId: string
  createBy: string
  createTime: string
  updateTime: string
}

export interface ChunkDetailDto {
  id: string
  content: string
  createBy: string
  createTime: string
  updateTime: string
}
