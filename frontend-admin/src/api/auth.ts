import api from './client'

export interface LoginParams {
  userId: string
  password: string
}

export interface LoginResponse {
  token: string
}

export const login = (data: LoginParams) => api.post<LoginResponse>('/auth/login', data)
