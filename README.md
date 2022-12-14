# express-microservices

## Usage

Edit ormconfig.json file in admin app with your parameters

## Install dependencies in admin and main app

```
npm install
```

## Run admin and main app

```
# Run build watch
npm run build

# Run app
npm start
```

## Send request in admin app (and DB is updated in main app)

```
# Get products GET
http://localhost:8000/api/products

# Get product GET
http://localhost:8000/api/products/:id

# Create product POST
http://localhost:8000/api/products

# Update product PUT
http://localhost:8000/api/products/:id

# Delete product DELETE
http://localhost:8000/api/products/:id

# Like product POST
http://localhost:8000/api/products/:id/like
```

## Requests in main app (and DB is updated in main app)

```
# Get products GET
http://localhost:8001/api/products

# Like product POST (sent axios post request to admin app and update likes)
http://localhost:8000/api/products/:id/like
```

- Version: 1.0.0
- License: Scalable Scripts
