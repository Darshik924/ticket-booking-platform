import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 50, //virtual users
  duration: "1m", //duration of the test
};

//base url of the api
const BASE_URL = "http://localhost:5000/api";

//function to perform the booking
export default function () {
  //create a login payload to get the token
  const payload = JSON.stringify({
    email: "hvk@gmail.com",
    password: "123456789",
  });

  //set the headers for the request
  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  //login request to get the token
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    payload,
    params
  );

  //check login status
  check(loginRes, {
    "login successful": (r) => r.status === 200,
  });

  //stops if login fails
  if (loginRes.status !== 200) {
    return;
  }

  //extract token if login is successful
  const token = JSON.parse(loginRes.body).token;

  //choose seat for each virtual user
  //const seatId = __VU; //for each interation after 1 sec iterate sae booked seats 1-10 
  const seatId = ((__ITER * 10 + __VU) % 200) + 1;//use different seat for each iteration and virtual user to avoid conflicts and to test the locking mechanism effectively

  //lock seat(redis)
  const lockRes = http.post(
    `${BASE_URL}/seats/${seatId}/lock`,
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  //verify lock
  check(lockRes, {
    "seat locked": (r) => r.status === 200,
  });

  if (lockRes.status !== 200) {
    return;
  }

  //book seat
  const bookingRes = http.post(
    `${BASE_URL}/bookings`,
    JSON.stringify({
      seatId: seatId,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  //verify booking
  check(bookingRes, {
    "booking successful": (r) => r.status === 201,
  });

  sleep(1); //wait for 1 second before making the booking request
}