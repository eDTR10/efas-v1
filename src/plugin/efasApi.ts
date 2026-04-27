import axios from 'axios'

const efasApi = axios.create({
    baseURL: import.meta.env.VITE_EFAS_API_URL || 'http://localhost:8000/api/v1',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
})

efasApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('efas_token')
    if (token) {
        config.headers.Authorization = `Token ${token}`
    }
    return config
})

efasApi.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('efas_token')
            localStorage.removeItem('efas_user')
            window.location.href = '/efas-v1/login'
        }
        return Promise.reject(err)
    }
)

export default efasApi
