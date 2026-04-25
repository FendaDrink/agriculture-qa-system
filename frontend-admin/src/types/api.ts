export interface AuthTokenPayload {
  userId: string
  username: string
  roleId: number
  city?: number | string
  exp?: number
  iat?: number
}

export interface AuthUser {
  userId: string
  username: string
  roleId: number
  city?: number | string
  token: string
}

export interface UserDto {
  id: string
  username: string
  city: number
  roleId: number
  status: number
  createTime: string
  updateTime: string
}

export interface CollectionDto {
  id: string
  collectionName: string
  city: number
  createBy: string
  username?: string
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
  username?: string
  createTime: string
  updateTime: string
}
