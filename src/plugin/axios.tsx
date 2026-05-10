import axios from "axios";

const efasApi = axios.create({
    baseURL: `${import.meta.env.VITE_EFAS_API_URL}api/v1/`,
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
})

efasApi.interceptors.request.use(config => {
    const token = localStorage.getItem('efas_token')
    if (token) {
        config.headers.Authorization = `Token ${token}`
    }
    return config
})

efasApi.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('efas_token')
            localStorage.removeItem('efas_user')
            window.location.href = '/efas-v1/login'
        }
        return Promise.reject(error)
    }
)

export default efasApi