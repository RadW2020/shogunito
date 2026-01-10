import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1764292664473 implements MigrationInterface {
  name = 'InitialSchema1764292664473';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."versions_status_enum" AS ENUM('wip', 'review', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "versions" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "status" "public"."versions_status_enum" NOT NULL DEFAULT 'wip', "name" character varying NOT NULL, "description" character varying, "file_path" character varying, "thumbnail_path" character varying, "artist" character varying, "created_by" character varying, "assigned_to" character varying, "format" character varying, "frame_range" character varying, "duration" numeric(10,2), "version_number" integer NOT NULL DEFAULT '1', "latest" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "status_updated_at" TIMESTAMP, "entity_code" character varying, "entity_id" integer, "entity_type" character varying, CONSTRAINT "UQ_45bba7efa1667f44d94be0e90a8" UNIQUE ("code"), CONSTRAINT "PK_921e9a820c96cc2cd7d4b3a107b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60b87846f9276c3a1249960016" ON "versions" ("entity_id", "latest") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c72fb79363a2023bccc40d0106" ON "versions" ("entity_code", "latest") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5228abceef3fdb3f85771a8a2f" ON "versions" ("entity_id", "entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ed7c7fc9afd07a19cc36b2cdc" ON "versions" ("entity_code", "entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_224c258ef7143dd330a7e5cdda" ON "versions" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7147d6c60fdc8bf498c488a2fd" ON "versions" ("assigned_to") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a51253f0d1672613a8096f4633" ON "versions" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77bb5252d840ea3d2424350ac8" ON "versions" ("latest") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d4f700b32189796445d266cde0" ON "versions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7cfb1e278243356909a38ba48b" ON "versions" ("entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06c119a1eab08d7cb23b87caa5" ON "versions" ("entity_code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "password_hash" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'member', "refreshToken" character varying, "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP, "password_reset_token" character varying, "password_reset_expires_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_409a0298fdd86a6495e23c25c6" ON "users" ("isActive") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `);
    await queryRunner.query(
      `CREATE TABLE "statuses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "color" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "applicable_entities" text array NOT NULL, "created_by" character varying, "assigned_to" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a860e6a2158936bd8216716545d" UNIQUE ("code"), CONSTRAINT "PK_2fd3770acdb67736f1a3e3d5399" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shots_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."shots_shottype_enum" AS ENUM('establishing', 'medium', 'closeup', 'detail')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shots" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "sequence_number" integer NOT NULL, "status" "public"."shots_status_enum" NOT NULL DEFAULT 'waiting', "shotType" "public"."shots_shottype_enum", "duration" integer, "cut_order" integer, "created_by" character varying, "assigned_to" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "sequence_id" integer NOT NULL, CONSTRAINT "UQ_c5bf22f131284c2779d386e78eb" UNIQUE ("code"), CONSTRAINT "PK_40b52561334dcee2a4421b371d7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a8817142c5d17b26a456e9e5f5" ON "shots" ("sequence_id", "cut_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_042599dd996d8eb27c2b55216a" ON "shots" ("sequence_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6083dc8be2ac930c89322e22ff" ON "shots" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ca83067d8c394d30bf27ffb425" ON "shots" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c374be3a9fbe97f049266884c2" ON "shots" ("assigned_to") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_bca8700a294b5b8af99a2997f5" ON "shots" ("status") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_b492e86a09e68108cfba519168" ON "shots" ("sequence_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sequences_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sequences" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "cut_order" integer NOT NULL, "status" "public"."sequences_status_enum" NOT NULL DEFAULT 'waiting', "duration" integer, "story_id" character varying, "created_by" character varying, "assigned_to" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "episode_id" integer NOT NULL, CONSTRAINT "UQ_66332b19ec4282f6ec87477e8a7" UNIQUE ("code"), CONSTRAINT "PK_7c7f5d8c822411196242b89bc76" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2279cf76712e8dc9a5088a7b4d" ON "sequences" ("episode_id", "cut_order") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4999df33b13615c77d70a94ecf" ON "sequences" ("episode_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3e18ed330a4b6571cb4f3dd26d" ON "sequences" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d21602106b0f556072a59a7713" ON "sequences" ("assigned_to") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0b9842ca7f709398ee1bb5ec3c" ON "sequences" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_376b2614da02d8de1539fc1202" ON "sequences" ("episode_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "jti" character varying NOT NULL, "token_family" character varying NOT NULL, "token_hash" character varying NOT NULL, "user_id" uuid NOT NULL, "is_revoked" boolean NOT NULL DEFAULT false, "is_used" boolean NOT NULL DEFAULT false, "expires_at" TIMESTAMP NOT NULL, "ip_address" character varying, "user_agent" character varying, "last_used_at" TIMESTAMP, "replaced_by_jti" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f3752400c98d5c0b3dca54d66d5" UNIQUE ("jti"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3752400c98d5c0b3dca54d66d" ON "refresh_tokens" ("jti") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4e85d79b1f7280fb672547f05c" ON "refresh_tokens" ("token_family", "is_revoked") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_14187aa4d2d58318c82c62c7ea" ON "refresh_tokens" ("user_id", "is_revoked") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."projects_status_enum" AS ENUM('active', 'bidding', 'onhold', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "status" "public"."projects_status_enum" NOT NULL DEFAULT 'active', "client_name" character varying, "start_date" character varying, "end_date" character varying, "created_by" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d95a87318392465ab663a32cc4f" UNIQUE ("code"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_64822f9e8fa705df79d4d40ed2" ON "projects" ("status", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_301eb04c3ee67cb2ab9cb2ab7b" ON "projects" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8a7ccdb94bcc8635f933c8f808" ON "projects" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a27865a7be17886e3088f4a650" ON "projects" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."playlists_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')`,
    );
    await queryRunner.query(
      `CREATE TABLE "playlists" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" character varying, "status" "public"."playlists_status_enum" NOT NULL DEFAULT 'waiting', "version_codes" text, "created_by" character varying, "assigned_to" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "status_updated_at" TIMESTAMP, "project_id" integer NOT NULL, CONSTRAINT "UQ_e83358e1a87d27c0d13275c166d" UNIQUE ("code"), CONSTRAINT "PK_a4597f4189a75d20507f3f7ef0d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fe728430e9c5164d5ff6ebeb68" ON "playlists" ("project_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a255f5932f5f13f2dbcb47d559" ON "playlists" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1d1296406d8476d86378cbae62" ON "playlists" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_258173b859fc9c52be2ad8e936" ON "playlists" ("assigned_to") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd9a4ac08e8358a2af5bfeee13" ON "playlists" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_226e2acad4c4c3cf7e5fd7d461" ON "playlists" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "entityType" character varying, "entityId" character varying, "isRead" boolean NOT NULL DEFAULT false, "metadata" jsonb, "triggeredBy" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_692a909ee0fa9383e7859f9b40" ON "notifications" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8ba28344602d583583b9ea1a50" ON "notifications" ("isRead") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_797841712968aa775af0cb0b54" ON "notifications" ("entityType", "entityId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21e65af2f4f242d4c85a92aff4" ON "notifications" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5340fc241f57310d243e5ab20b" ON "notifications" ("userId", "isRead") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notes_linktype_enum" AS ENUM('Project', 'Episode', 'Asset', 'Sequence', 'Shot', 'Playlist', 'Version')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notes_notetype_enum" AS ENUM('note', 'approval', 'revision', 'client_note')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "link_id" character varying NOT NULL, "linkType" "public"."notes_linktype_enum" NOT NULL, "subject" character varying NOT NULL, "content" text NOT NULL, "noteType" "public"."notes_notetype_enum" NOT NULL DEFAULT 'note', "is_read" boolean NOT NULL DEFAULT false, "attachments" text, "created_by" character varying, "assigned_to" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cc37e0f59ae601bae46fc8d62c" ON "notes" ("link_id", "linkType", "is_read") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_def4674be2d6ae6b8496cb1c3e" ON "notes" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_691aa961f6e2910307bc5d9713" ON "notes" ("assigned_to") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b86c5f2b5de1e7a3d2a428cfb5" ON "notes" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a8ff1772cb0051b2f5ff66c340" ON "notes" ("noteType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1d342c269a6ddb6c90aac891f7" ON "notes" ("is_read") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e735322035ce600bde8d125b0c" ON "notes" ("link_id", "linkType") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "username" character varying, "action" character varying NOT NULL, "entityType" character varying NOT NULL, "entityId" character varying, "changes" jsonb, "ipAddress" character varying, "userAgent" text, "method" character varying, "endpoint" character varying, "statusCode" integer, "errorMessage" text, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c69efb19bf127c97e6740ad530" ON "audit_logs" ("createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_01993ae76b293d3b866cc3a125" ON "audit_logs" ("entityType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cfa83f61e4d27a87fcae1e025a" ON "audit_logs" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."episodes_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')`,
    );
    await queryRunner.query(
      `CREATE TABLE "episodes" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "ep_number" integer, "name" character varying NOT NULL, "description" character varying, "status" "public"."episodes_status_enum" NOT NULL DEFAULT 'waiting', "duration" integer, "created_by" character varying, "assigned_to" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "project_id" integer NOT NULL, CONSTRAINT "UQ_e15c24fc64d11a72051ff8ae12a" UNIQUE ("code"), CONSTRAINT "PK_6a003fda8b0473fffc39cb831c7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0f80f326e866d6af545ec7da01" ON "episodes" ("project_id", "ep_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7c81a9ab7cea8fc30aace82cf6" ON "episodes" ("project_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8cb9ff812751cf1bc59886b3b7" ON "episodes" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10fe330bccae0894e0ead80529" ON "episodes" ("assigned_to") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9195b9787db57f3cc6dd65ef83" ON "episodes" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_399ff226f99146a19649a0f94c" ON "episodes" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assets_assettype_enum" AS ENUM('character', 'prop', 'environment', 'script', 'avatar')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."assets_status_enum" AS ENUM('waiting', 'in_progress', 'review', 'approved', 'final')`,
    );
    await queryRunner.query(
      `CREATE TABLE "assets" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "assetType" "public"."assets_assettype_enum" NOT NULL DEFAULT 'prop', "status" "public"."assets_status_enum" NOT NULL DEFAULT 'waiting', "description" character varying, "thumbnail_path" character varying, "created_by" character varying, "assigned_to" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "project_id" integer NOT NULL, CONSTRAINT "UQ_bff60c1b89bff7edff592d85ea4" UNIQUE ("code"), CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc0e60dcfd169bd94a01aee789" ON "assets" ("project_id", "assetType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_88c4e67768a0ab6925b9f39f32" ON "assets" ("project_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6b70fc577f0cc50bbb0788a634" ON "assets" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dccd1dbe2c036b9ab80876466b" ON "assets" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ce7e037e1bac19ddf02d1d82d" ON "assets" ("assigned_to") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f470323a63cff98ee4c862bfb3" ON "assets" ("assetType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06be3e2fd34f70a8e68e518dbf" ON "assets" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0e5e8c16a2a04e8549eda87b70" ON "assets" ("project_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "shots" ADD CONSTRAINT "FK_b492e86a09e68108cfba519168c" FOREIGN KEY ("sequence_id") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sequences" ADD CONSTRAINT "FK_376b2614da02d8de1539fc12024" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlists" ADD CONSTRAINT "FK_226e2acad4c4c3cf7e5fd7d461a" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "episodes" ADD CONSTRAINT "FK_399ff226f99146a19649a0f94c9" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assets" ADD CONSTRAINT "FK_0e5e8c16a2a04e8549eda87b70c" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assets" DROP CONSTRAINT "FK_0e5e8c16a2a04e8549eda87b70c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "episodes" DROP CONSTRAINT "FK_399ff226f99146a19649a0f94c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "playlists" DROP CONSTRAINT "FK_226e2acad4c4c3cf7e5fd7d461a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sequences" DROP CONSTRAINT "FK_376b2614da02d8de1539fc12024"`,
    );
    await queryRunner.query(`ALTER TABLE "shots" DROP CONSTRAINT "FK_b492e86a09e68108cfba519168c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0e5e8c16a2a04e8549eda87b70"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_06be3e2fd34f70a8e68e518dbf"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f470323a63cff98ee4c862bfb3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6ce7e037e1bac19ddf02d1d82d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dccd1dbe2c036b9ab80876466b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6b70fc577f0cc50bbb0788a634"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_88c4e67768a0ab6925b9f39f32"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dc0e60dcfd169bd94a01aee789"`);
    await queryRunner.query(`DROP TABLE "assets"`);
    await queryRunner.query(`DROP TYPE "public"."assets_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."assets_assettype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_399ff226f99146a19649a0f94c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9195b9787db57f3cc6dd65ef83"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_10fe330bccae0894e0ead80529"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8cb9ff812751cf1bc59886b3b7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7c81a9ab7cea8fc30aace82cf6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0f80f326e866d6af545ec7da01"`);
    await queryRunner.query(`DROP TABLE "episodes"`);
    await queryRunner.query(`DROP TYPE "public"."episodes_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cfa83f61e4d27a87fcae1e025a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_01993ae76b293d3b866cc3a125"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c69efb19bf127c97e6740ad530"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e735322035ce600bde8d125b0c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1d342c269a6ddb6c90aac891f7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a8ff1772cb0051b2f5ff66c340"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b86c5f2b5de1e7a3d2a428cfb5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_691aa961f6e2910307bc5d9713"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_def4674be2d6ae6b8496cb1c3e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cc37e0f59ae601bae46fc8d62c"`);
    await queryRunner.query(`DROP TABLE "notes"`);
    await queryRunner.query(`DROP TYPE "public"."notes_notetype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."notes_linktype_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5340fc241f57310d243e5ab20b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_21e65af2f4f242d4c85a92aff4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_797841712968aa775af0cb0b54"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8ba28344602d583583b9ea1a50"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_692a909ee0fa9383e7859f9b40"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_226e2acad4c4c3cf7e5fd7d461"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dd9a4ac08e8358a2af5bfeee13"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_258173b859fc9c52be2ad8e936"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1d1296406d8476d86378cbae62"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a255f5932f5f13f2dbcb47d559"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fe728430e9c5164d5ff6ebeb68"`);
    await queryRunner.query(`DROP TABLE "playlists"`);
    await queryRunner.query(`DROP TYPE "public"."playlists_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a27865a7be17886e3088f4a650"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8a7ccdb94bcc8635f933c8f808"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_301eb04c3ee67cb2ab9cb2ab7b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_64822f9e8fa705df79d4d40ed2"`);
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_14187aa4d2d58318c82c62c7ea"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4e85d79b1f7280fb672547f05c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f3752400c98d5c0b3dca54d66d"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_376b2614da02d8de1539fc1202"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0b9842ca7f709398ee1bb5ec3c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d21602106b0f556072a59a7713"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3e18ed330a4b6571cb4f3dd26d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4999df33b13615c77d70a94ecf"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2279cf76712e8dc9a5088a7b4d"`);
    await queryRunner.query(`DROP TABLE "sequences"`);
    await queryRunner.query(`DROP TYPE "public"."sequences_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b492e86a09e68108cfba519168"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bca8700a294b5b8af99a2997f5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c374be3a9fbe97f049266884c2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ca83067d8c394d30bf27ffb425"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6083dc8be2ac930c89322e22ff"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_042599dd996d8eb27c2b55216a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a8817142c5d17b26a456e9e5f5"`);
    await queryRunner.query(`DROP TABLE "shots"`);
    await queryRunner.query(`DROP TYPE "public"."shots_shottype_enum"`);
    await queryRunner.query(`DROP TYPE "public"."shots_status_enum"`);
    await queryRunner.query(`DROP TABLE "statuses"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_409a0298fdd86a6495e23c25c6"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_06c119a1eab08d7cb23b87caa5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7cfb1e278243356909a38ba48b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d4f700b32189796445d266cde0"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_77bb5252d840ea3d2424350ac8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a51253f0d1672613a8096f4633"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7147d6c60fdc8bf498c488a2fd"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_224c258ef7143dd330a7e5cdda"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6ed7c7fc9afd07a19cc36b2cdc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5228abceef3fdb3f85771a8a2f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c72fb79363a2023bccc40d0106"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_60b87846f9276c3a1249960016"`);
    await queryRunner.query(`DROP TABLE "versions"`);
    await queryRunner.query(`DROP TYPE "public"."versions_status_enum"`);
  }
}
