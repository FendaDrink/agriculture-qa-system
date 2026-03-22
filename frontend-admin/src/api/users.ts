import api from './client'
import type { UserDto } from '../types/api'

export interface CreateUserParams {
  id: string
  username: string
  password: string
  roleId: number
  status: number
}

export interface UpdateUserParams {
  id: string
  username?: string
  roleId?: number
  status?: number
}

export interface UpdatePasswordParams {
  userId: string
  password: string
}

export const getUsers = () => api.get<UserDto[]>('/user')

export const createUser = (data: CreateUserParams) => api.post<UserDto>('/user', data)

export const updateUser = (data: UpdateUserParams) => api.patch<UserDto>('/user', data)

export const updateUserPassword = (data: UpdatePasswordParams) => api.patch<void>('/user/pwd', data)

export const deleteUser = (userId: string) =>
  api.delete<void>('/user', { params: { userId } })
