import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTripTable1708294957585 implements MigrationInterface {
    name = 'CreateTripTable1708294957585'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`trip\` (\`id\` int NOT NULL AUTO_INCREMENT, \`full_name\` varchar(255) NOT NULL, \`user_id\` int NULL, \`pickup_location\` varchar(255) NOT NULL, \`phone_number\` varchar(255) NOT NULL, \`destination_location\` varchar(255) NOT NULL, \`request_time\` datetime NULL, \`accepted_time\` datetime NULL, \`driver_id\` int NULL, \`status\` enum ('Requested', 'Accepted', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Requested', \`deleted_at\` datetime(6) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`trip\``);
    }

}
