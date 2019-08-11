#### How to run the application

- Using Docker:
  ```shell
   DATABASE_NAME=<DATABASE_NAME> DATABASE_USERNAME=<DATABASE_USERNAME> DATABASE_PASSWORD=<DATABASE_PASSWORD> docker-compose up -d
  ```
- Using yarn :
  `yarn run start`
  > for dev mode, you can run using `yarn run dev`
- Using npm:

```shell
npm start
```

- Using pm2:

```shell
pm2 start process.json
```

Once Apllication starts in `development` Environment, go to `/documentation` for api docs.
