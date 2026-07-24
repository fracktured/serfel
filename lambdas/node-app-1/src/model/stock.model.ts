import { Model, DataTypes, Optional, Sequelize } from 'sequelize';
import { logger } from '../config/winston';

interface StockAttributes {
    idBodega: number;
    idProducto: number;
    cantidad: number;
}

interface StockCreationAttributes extends Optional<StockAttributes, 'idBodega' | 'idProducto'> { }

export class Stock extends Model<StockAttributes, StockCreationAttributes>
    implements StockAttributes {

    idBodega!: number;
    idProducto!: number;
    cantidad!: number;

    public static doInit = (sequelize: Sequelize): typeof Stock => {
        return Stock.init({
            idBodega: {
                allowNull: false,
                type: DataTypes.INTEGER,
                primaryKey: true,
                field: 'id_bodega'
            },
            idProducto: {
                allowNull: false,
                type: DataTypes.INTEGER,
                primaryKey: true,
                field: 'id_producto'
            },
            cantidad: {
                type: DataTypes.DECIMAL(18, 3),
                allowNull: false,
                field: 'cantidad'
            }
        }, {
            sequelize,
            tableName: '50_m_stock',
            timestamps: false
        });
    }

    public static reduceStock = async (idBodega: number, idProducto: number, cantidad: number): Promise<Stock | null> => {
        const stock = await Stock.findOne({
            where: {
               idBodega: idBodega,
               idProducto: idProducto
            }
        });
        if (stock) {
            const cantidadActual = stock.cantidad;
            stock.cantidad -= cantidad;
            logger.info(`Stock producto ${idProducto} reducido en ${cantidad} de ${cantidadActual} a ${stock.cantidad}`);
            await stock.save();
        }
        return stock;
    }
} 