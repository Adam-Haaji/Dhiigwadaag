import axios from 'axios';
import { API_URL } from '@/config/api';

axios.defaults.baseURL = API_URL;

export default axios;
