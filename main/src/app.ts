import * as express from 'express';
import * as cors from 'cors';
import { createConnection } from 'typeorm';
import * as amqp from 'amqplib/callback_api';
import { Product } from './entity/product';
const axios = require('axios');
import { ObjectId } from 'mongodb';
import 'dotenv/config';

createConnection().then(db => {
	const productRepo = db.getMongoRepository(Product);
	amqp.connect(process.env.AMQP_URI, (err0, connection) => {
		if (err0) {
			throw err0;
		}

		connection.createChannel((err1, channel) => {
			if (err1) {
				throw err1;
			}

			channel.assertQueue('product_created', { durable: false });
			channel.assertQueue('product_updated', { durable: false });
			channel.assertQueue('product_deleted', { durable: false });

			const app = express();

			app.use(
				cors({
					origin: [
						'http://localhost:3000',
						'http://localhost:8080',
						'http://localhost:4200',
					],
				})
			);

			app.use(express.json());

			channel.consume(
				'product_created',
				async message => {
					const eventProduct: Product = JSON.parse(message.content.toString());
					const product = new Product();

					product.admin_id = parseInt(eventProduct.id);
					product.title = eventProduct.title;
					product.image = eventProduct.image;
					product.likes = eventProduct.likes;

					await productRepo.save(product);
					console.log('Product created');
				},
				{ noAck: true }
			);

			channel.consume(
				'product_updated',
				async message => {
					const eventProduct: Product = JSON.parse(message.content.toString());

					const product = await productRepo.findOne({
						where: {
							admin_id: parseInt(eventProduct.id),
						},
					});

					productRepo.merge(product, {
						title: eventProduct.title,
						image: eventProduct.image,
						likes: eventProduct.likes,
					});

					await productRepo.save(product);
					console.log('Product updated');
				},
				{ noAck: true }
			);

			channel.consume(
				'product_deleted',
				async message => {
					const admin_id = parseInt(message.content.toString());

					await productRepo.deleteOne({ admin_id });
					console.log('Product deleted');
				},
				{ noAck: true }
			);

			app.get(
				'/api/products',
				async (req: express.Request, res: express.Response) => {
					const products = await productRepo.find();

					return res.status(200).json(products);
				}
			);

			app.post(
				'/api/products/:id/like',
				async (req: express.Request, res: express.Response) => {
					const product = await productRepo.findOne({
						where: { _id: new ObjectId(req.params.id) } as Partial<Product>,
					});

					console.log(product);

					await axios.post(
						`http://localhost:8000/api/products/${product.admin_id}/like`,
						{}
					);
					product.likes++;

					await productRepo.save(product);

					return res.status(200).json(product);
				}
			);

			app.listen(8001, () => {
				console.log('App is listening on port 8001');
			});
			process.on('beforeExit', () => {
				console.log('closing');
				connection.close();
			});
		});
	});
});
