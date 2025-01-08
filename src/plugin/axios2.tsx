import axios from "axios";



axios.defaults.baseURL = `https://api.apico.dev/v1/dR75gX/`
axios.defaults.headers.get['Accept'] = 'application/json';
axios.defaults.headers.post['Content-Type'] = 'application/json';

export default axios