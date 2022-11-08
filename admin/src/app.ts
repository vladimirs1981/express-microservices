import * as express from 'express';
import * as cors from 'cors';
import { createConnection } from 'typeorm';
import { Product } from './entity/product.entity';
import * as amqp from 'amqplib/callback_api';
import 'dotenv/config';

createConnection().then(db => {
	const productRepo = db.getRepository(Product);

	amqp.connect(process.env.AMQP_URI, (err0, connection) => {
		if (err0) {
			throw err0;
		}

		connection.createChannel((err1, channel) => {
			if (err1) {
				throw err1;
			}
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

			app.get(
				'/api/products',
				async (req: express.Request, res: express.Response) => {
					const products = await productRepo.find();

					res.json(products);
				}
			);

			app.post(
				'/api/products',
				async (req: express.Request, res: express.Response) => {
					const product = await productRepo.create(req.body);
					const result = await productRepo.save(product);
					channel.sendToQueue(
						'product_created',
						Buffer.from(JSON.stringify(result))
					);

					return res.status(201).json(result);
				}
			);

			app.get(
				'/api/products/:id',
				async (req: express.Request, res: express.Response) => {
					const product = await productRepo.findOne({
						where: {
							id: Number(req.params.id),
						},
					});

					return res.status(200).json(product);
				}
			);

			app.put(
				'/api/products/:id',
				async (req: express.Request, res: express.Response) => {
					const product = await productRepo.findOne({
						where: {
							id: Number(req.params.id),
						},
					});

					productRepo.merge(product, req.body);

					const result = await productRepo.save(product);
					channel.sendToQueue(
						'product_updated',
						Buffer.from(JSON.stringify(result))
					);
					return res.status(200).json(result);
				}
			);

			app.delete(
				'/api/products/:id',
				async (req: express.Request, res: express.Response) => {
					const result = await productRepo.delete(req.params.id);

					channel.sendToQueue('product_deleted', Buffer.from(req.params.id));

					return res.status(200).json(result);
				}
			);

			app.post(
				'/api/products/:id/like',
				async (req: express.Request, res: express.Response) => {
					const product = await productRepo.findOne({
						where: {
							id: Number(req.params.id),
						},
					});

					product.likes++;

					const result = await productRepo.save(product);

					return res.status(200).json(result);
				}
			);

			app.listen(8000, () => {
				console.log('App is listening on port 8000');
			});

			process.on('beforeExit', () => {
				console.log('closing');
				connection.close();
			});
		});
	});
});
