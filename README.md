# Microservices example stack with API gateway and JWT

A simple API gateway setup that queries standalone services in the backend, and sends an aggregate response.

This example has all services in one codebase for convenience, so it's up to you to split up the services.
You also might want to containerize them with my [docker-toolbox](https://github.com/Morriz/docker-toolbox).
I have included a `docker-compose` file to start the app containers in orchestration.

## Run the app stack

Just run `DEBUG=mo-micro:* npm run all` and see the output when visiting [http://localhost:3000](http://localhost:3000).

This will be an unauthenticated request that is allowed to query the 'hello' service, but the authenticated 'world' service throws a 401.
The aggregating 'api' gateway then catches the error and shows a 401 with the means to login again.
This api gateway could be extended to allow for a finer handling of unauthenticated or error responses from services (circuit breaking) and other things like rate limiting.
 
Now login with [http://localhost:3000/login?username=x&password=x](http://localhost:3000/login?username=x&password=x), and the "jwt" value will be set as cookie under "accessToken".

By passing the key in the request (cookie will be set, but overriding with a url param works as well), the jwt session will be looked up.

Logout with [http://localhost:3000/logout](http://localhost:3000/logout) to see a redirect back to the login screen.

