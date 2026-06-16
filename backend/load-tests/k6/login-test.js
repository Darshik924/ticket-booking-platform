import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 170,
  duration: '1m',
};

const BASE_URL = 'http://localhost:5000/api/auth';

export default function () {
  const payload = JSON.stringify({
    email: 'test@gmail.com',
    password: '123456',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(
    `${BASE_URL}/login`,
    payload,
    params
  );

  check(res, {
    'login successful': (r) => r.status === 200,
    'token exists': (r) => {
        try{
            return r.status===200 && 
            JSON.parse(r.body).token !==undefined;
        }catch{
            return false;
        }
    
    },
  });

  sleep(1);
}