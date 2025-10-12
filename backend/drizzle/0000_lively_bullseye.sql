CREATE TYPE "public"."card_type" AS ENUM('Yellow Card', 'Red Card', 'Second Yellow');--> statement-breakpoint
CREATE TYPE "public"."position_category" AS ENUM('Goalkeeper', 'Defender', 'Midfielder', 'Forward');--> statement-breakpoint
CREATE TABLE "competitions" (
	"competition_id" integer PRIMARY KEY NOT NULL,
	"competition_name" text NOT NULL,
	"country_id" integer,
	"competition_gender" varchar(10) NOT NULL,
	"competition_youth" boolean DEFAULT false NOT NULL,
	"competition_international" boolean DEFAULT false NOT NULL,
	"raw_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"statsbomb_id" integer,
	"name" text NOT NULL,
	"type" varchar(20) DEFAULT 'country' NOT NULL,
	CONSTRAINT "countries_statsbomb_id_unique" UNIQUE("statsbomb_id"),
	CONSTRAINT "countries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"season_id" integer NOT NULL,
	"competition_id" integer NOT NULL,
	"season_name" text NOT NULL,
	"match_updated" timestamp with time zone NOT NULL,
	"match_available" timestamp with time zone NOT NULL,
	"match_updated_360" timestamp with time zone,
	"match_available_360" timestamp with time zone,
	"raw_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "seasons_competition_id_season_id_pk" PRIMARY KEY("competition_id","season_id")
);
--> statement-breakpoint
CREATE TABLE "bad_behaviours" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"card_id" integer
);
--> statement-breakpoint
CREATE TABLE "ball_receipt_outcomes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "ball_receipt_outcomes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ball_receipts" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"outcome_id" integer
);
--> statement-breakpoint
CREATE TABLE "ball_recoveries" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"recovery_failure" boolean DEFAULT false NOT NULL,
	"offensive" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"deflection" boolean DEFAULT false NOT NULL,
	"offensive" boolean DEFAULT false NOT NULL,
	"save_block" boolean DEFAULT false NOT NULL,
	"counterpress" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "body_parts" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "body_parts_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "carries" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"end_x" numeric(5, 2),
	"end_y" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "clearances" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"body_part_id" integer,
	"aerial_won" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dribble_outcomes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "dribble_outcomes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dribbles" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"outcome_id" integer,
	"overrun" boolean DEFAULT false NOT NULL,
	"nutmeg" boolean DEFAULT false NOT NULL,
	"no_touch" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duel_outcomes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "duel_outcomes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "duel_types" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "duel_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "duels" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"duel_type_id" integer,
	"outcome_id" integer,
	"counterpress" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_relationships" (
	"event_id" uuid NOT NULL,
	"related_event_id" uuid NOT NULL,
	CONSTRAINT "event_relationships_event_id_related_event_id_pk" PRIMARY KEY("event_id","related_event_id")
);
--> statement-breakpoint
CREATE TABLE "event_types" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "event_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"index" integer NOT NULL,
	"match_id" integer NOT NULL,
	"period" smallint NOT NULL,
	"timestamp" interval NOT NULL,
	"minute" smallint NOT NULL,
	"second" smallint NOT NULL,
	"type_id" integer NOT NULL,
	"possession" integer NOT NULL,
	"possession_team_id" integer NOT NULL,
	"play_pattern_id" integer,
	"team_id" integer NOT NULL,
	"player_id" integer,
	"position_id" integer,
	"location_x" numeric(5, 2),
	"location_y" numeric(5, 2),
	"duration" numeric(10, 4),
	"under_pressure" boolean DEFAULT false NOT NULL,
	"off_camera" boolean DEFAULT false NOT NULL,
	"out" boolean DEFAULT false NOT NULL,
	"counterpress" boolean DEFAULT false NOT NULL,
	"raw_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fifty_fifties" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"outcome_id" integer,
	"counterpress" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fifty_fifty_outcomes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "fifty_fifty_outcomes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "fouls" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"penalty" boolean DEFAULT false NOT NULL,
	"card_id" integer,
	"foul_type_id" integer,
	"counterpress" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goalkeeper_events" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"position_id" integer,
	"technique_id" integer,
	"body_part_id" integer,
	"gk_type_id" integer,
	"outcome_id" integer
);
--> statement-breakpoint
CREATE TABLE "goalkeeper_outcomes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "goalkeeper_outcomes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "goalkeeper_positions" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "goalkeeper_positions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "goalkeeper_techniques" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "goalkeeper_techniques_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "goalkeeper_types" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "goalkeeper_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "interception_outcomes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "interception_outcomes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "interceptions" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"outcome_id" integer,
	"counterpress" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pass_heights" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "pass_heights_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pass_outcomes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "pass_outcomes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pass_techniques" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "pass_techniques_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pass_types" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "pass_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "passes" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"recipient_id" integer,
	"length" numeric(5, 2),
	"angle" numeric(6, 4),
	"end_x" numeric(5, 2),
	"end_y" numeric(5, 2),
	"height_id" integer,
	"type_id" integer,
	"body_part_id" integer,
	"technique_id" integer,
	"outcome_id" integer,
	"shot_assist" boolean DEFAULT false NOT NULL,
	"goal_assist" boolean DEFAULT false NOT NULL,
	"assisted_shot_id" uuid,
	"switch" boolean DEFAULT false NOT NULL,
	"cross" boolean DEFAULT false NOT NULL,
	"cut_back" boolean DEFAULT false NOT NULL,
	"deflected" boolean DEFAULT false NOT NULL,
	"miscommunication" boolean DEFAULT false NOT NULL,
	"aerial_won" boolean DEFAULT false NOT NULL,
	"no_touch" boolean DEFAULT false NOT NULL,
	"backheel" boolean DEFAULT false NOT NULL,
	"through_ball" boolean DEFAULT false NOT NULL,
	"inswinging" boolean DEFAULT false NOT NULL,
	"outswinging" boolean DEFAULT false NOT NULL,
	"straight" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_patterns" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "play_patterns_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pressures" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"counterpress" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shot_outcomes" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "shot_outcomes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "shot_techniques" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "shot_techniques_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "shot_types" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "shot_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "shots" (
	"event_id" uuid PRIMARY KEY NOT NULL,
	"shot_xg" numeric(5, 4),
	"end_x" numeric(5, 2),
	"end_y" numeric(5, 2),
	"end_z" numeric(4, 2),
	"outcome_id" integer NOT NULL,
	"type_id" integer,
	"body_part_id" integer,
	"technique_id" integer,
	"first_time" boolean DEFAULT false NOT NULL,
	"one_on_one" boolean DEFAULT false NOT NULL,
	"aerial_won" boolean DEFAULT false NOT NULL,
	"deflected" boolean DEFAULT false NOT NULL,
	"open_goal" boolean DEFAULT false NOT NULL,
	"follows_dribble" boolean DEFAULT false NOT NULL,
	"redirect" boolean DEFAULT false NOT NULL,
	"key_pass_id" uuid,
	"freeze_frame" jsonb
);
--> statement-breakpoint
CREATE TABLE "player_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"time" interval NOT NULL,
	"card_type" "card_type" NOT NULL,
	"reason" varchar(100) NOT NULL,
	"period" smallint NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_lineups" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"jersey_number" smallint NOT NULL,
	"country_id" integer NOT NULL,
	"is_starter" boolean NOT NULL,
	"minutes_played" numeric(5, 2),
	"raw_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"position_id" integer NOT NULL,
	"from_time" interval NOT NULL,
	"to_time" interval,
	"from_period" smallint NOT NULL,
	"to_period" smallint,
	"start_reason" varchar(100) NOT NULL,
	"end_reason" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "players" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"player_name" varchar(255) NOT NULL,
	"player_nickname" varchar(100),
	"total_matches" integer DEFAULT 0,
	"total_minutes_played" numeric(8, 2) DEFAULT '0',
	"total_goals" integer DEFAULT 0,
	"total_assists" integer DEFAULT 0,
	"total_yellow_cards" integer DEFAULT 0,
	"total_red_cards" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" integer PRIMARY KEY NOT NULL,
	"position_name" varchar(50) NOT NULL,
	"position_category" "position_category" NOT NULL,
	"display_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "positions_position_name_unique" UNIQUE("position_name")
);
--> statement-breakpoint
CREATE TABLE "competition_stages" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "competition_stages_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"manager_id" integer PRIMARY KEY NOT NULL,
	"manager_name" text NOT NULL,
	"manager_nickname" text,
	"date_of_birth" date,
	"country_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "match_managers" (
	"match_id" integer NOT NULL,
	"manager_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"is_home_team" boolean NOT NULL,
	CONSTRAINT "match_managers_match_id_manager_id_team_id_pk" PRIMARY KEY("match_id","manager_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"match_id" integer PRIMARY KEY NOT NULL,
	"competition_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"match_date" date NOT NULL,
	"kick_off" time,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"home_team_group" varchar(20),
	"away_team_group" varchar(20),
	"match_week" integer,
	"competition_stage_id" integer,
	"stadium_id" integer,
	"referee_id" integer,
	"match_status" varchar(20) DEFAULT 'available' NOT NULL,
	"match_status_360" varchar(20),
	"last_updated" timestamp with time zone NOT NULL,
	"last_updated_360" timestamp with time zone,
	"data_version" varchar(10),
	"shot_fidelity_version" varchar(10),
	"xy_fidelity_version" varchar(10),
	"raw_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referees" (
	"referee_id" integer PRIMARY KEY NOT NULL,
	"referee_name" text NOT NULL,
	"country_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stadiums" (
	"stadium_id" integer PRIMARY KEY NOT NULL,
	"stadium_name" text NOT NULL,
	"country_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"team_id" integer PRIMARY KEY NOT NULL,
	"team_name" text NOT NULL,
	"team_gender" varchar(10) NOT NULL,
	"country_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "three_sixty_frames" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"event_uuid" uuid NOT NULL,
	"visible_area" jsonb DEFAULT '[]' NOT NULL,
	"player_count" smallint DEFAULT 0 NOT NULL,
	"visible_area_size" numeric(8, 2),
	"raw_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "three_sixty_frames_event_uuid_unique" UNIQUE("event_uuid")
);
--> statement-breakpoint
CREATE TABLE "three_sixty_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"frame_id" integer NOT NULL,
	"teammate" boolean NOT NULL,
	"actor" boolean DEFAULT false NOT NULL,
	"keeper" boolean DEFAULT false NOT NULL,
	"location_x" numeric(6, 2) NOT NULL,
	"location_y" numeric(6, 2) NOT NULL,
	"distance_to_actor" numeric(6, 2),
	"in_visible_area" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_competitions_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("competition_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bad_behaviours" ADD CONSTRAINT "bad_behaviours_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ball_receipts" ADD CONSTRAINT "ball_receipts_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ball_receipts" ADD CONSTRAINT "ball_receipts_outcome_id_ball_receipt_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."ball_receipt_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ball_recoveries" ADD CONSTRAINT "ball_recoveries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carries" ADD CONSTRAINT "carries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clearances" ADD CONSTRAINT "clearances_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clearances" ADD CONSTRAINT "clearances_body_part_id_body_parts_id_fk" FOREIGN KEY ("body_part_id") REFERENCES "public"."body_parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dribbles" ADD CONSTRAINT "dribbles_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dribbles" ADD CONSTRAINT "dribbles_outcome_id_dribble_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."dribble_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_duel_type_id_duel_types_id_fk" FOREIGN KEY ("duel_type_id") REFERENCES "public"."duel_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_outcome_id_duel_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."duel_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_relationships" ADD CONSTRAINT "event_relationships_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_relationships" ADD CONSTRAINT "event_relationships_related_event_id_events_id_fk" FOREIGN KEY ("related_event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_type_id_event_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."event_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_possession_team_id_teams_team_id_fk" FOREIGN KEY ("possession_team_id") REFERENCES "public"."teams"("team_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_play_pattern_id_play_patterns_id_fk" FOREIGN KEY ("play_pattern_id") REFERENCES "public"."play_patterns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_team_id_teams_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("team_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fifty_fifties" ADD CONSTRAINT "fifty_fifties_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fifty_fifties" ADD CONSTRAINT "fifty_fifties_outcome_id_fifty_fifty_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."fifty_fifty_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fouls" ADD CONSTRAINT "fouls_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalkeeper_events" ADD CONSTRAINT "goalkeeper_events_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalkeeper_events" ADD CONSTRAINT "goalkeeper_events_position_id_goalkeeper_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."goalkeeper_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalkeeper_events" ADD CONSTRAINT "goalkeeper_events_technique_id_goalkeeper_techniques_id_fk" FOREIGN KEY ("technique_id") REFERENCES "public"."goalkeeper_techniques"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalkeeper_events" ADD CONSTRAINT "goalkeeper_events_body_part_id_body_parts_id_fk" FOREIGN KEY ("body_part_id") REFERENCES "public"."body_parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalkeeper_events" ADD CONSTRAINT "goalkeeper_events_gk_type_id_goalkeeper_types_id_fk" FOREIGN KEY ("gk_type_id") REFERENCES "public"."goalkeeper_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goalkeeper_events" ADD CONSTRAINT "goalkeeper_events_outcome_id_goalkeeper_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."goalkeeper_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interceptions" ADD CONSTRAINT "interceptions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interceptions" ADD CONSTRAINT "interceptions_outcome_id_interception_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."interception_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_recipient_id_players_player_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_height_id_pass_heights_id_fk" FOREIGN KEY ("height_id") REFERENCES "public"."pass_heights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_type_id_pass_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."pass_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_body_part_id_body_parts_id_fk" FOREIGN KEY ("body_part_id") REFERENCES "public"."body_parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_technique_id_pass_techniques_id_fk" FOREIGN KEY ("technique_id") REFERENCES "public"."pass_techniques"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_outcome_id_pass_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."pass_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passes" ADD CONSTRAINT "passes_assisted_shot_id_events_id_fk" FOREIGN KEY ("assisted_shot_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pressures" ADD CONSTRAINT "pressures_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_outcome_id_shot_outcomes_id_fk" FOREIGN KEY ("outcome_id") REFERENCES "public"."shot_outcomes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_type_id_shot_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."shot_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_body_part_id_body_parts_id_fk" FOREIGN KEY ("body_part_id") REFERENCES "public"."body_parts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_technique_id_shot_techniques_id_fk" FOREIGN KEY ("technique_id") REFERENCES "public"."shot_techniques"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shots" ADD CONSTRAINT "shots_key_pass_id_events_id_fk" FOREIGN KEY ("key_pass_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_cards" ADD CONSTRAINT "player_cards_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_cards" ADD CONSTRAINT "player_cards_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_lineups" ADD CONSTRAINT "player_lineups_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_lineups" ADD CONSTRAINT "player_lineups_team_id_teams_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("team_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_lineups" ADD CONSTRAINT "player_lineups_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_lineups" ADD CONSTRAINT "player_lineups_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_positions" ADD CONSTRAINT "player_positions_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_positions" ADD CONSTRAINT "player_positions_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_positions" ADD CONSTRAINT "player_positions_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_managers" ADD CONSTRAINT "match_managers_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_managers" ADD CONSTRAINT "match_managers_manager_id_managers_manager_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("manager_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_managers" ADD CONSTRAINT "match_managers_team_id_teams_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("team_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_competitions_competition_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("competition_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_team_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("team_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_team_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("team_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_stage_id_competition_stages_id_fk" FOREIGN KEY ("competition_stage_id") REFERENCES "public"."competition_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_stadium_id_stadiums_stadium_id_fk" FOREIGN KEY ("stadium_id") REFERENCES "public"."stadiums"("stadium_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_referee_id_referees_referee_id_fk" FOREIGN KEY ("referee_id") REFERENCES "public"."referees"("referee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referees" ADD CONSTRAINT "referees_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stadiums" ADD CONSTRAINT "stadiums_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "three_sixty_frames" ADD CONSTRAINT "three_sixty_frames_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "three_sixty_players" ADD CONSTRAINT "three_sixty_players_frame_id_three_sixty_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."three_sixty_frames"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_360_frames_match" ON "three_sixty_frames" USING btree ("match_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_360_frames_event" ON "three_sixty_frames" USING btree ("event_uuid");--> statement-breakpoint
CREATE INDEX "idx_360_players_frame" ON "three_sixty_players" USING btree ("frame_id");--> statement-breakpoint
CREATE INDEX "idx_360_players_teammate" ON "three_sixty_players" USING btree ("teammate");--> statement-breakpoint
CREATE INDEX "idx_360_players_actor" ON "three_sixty_players" USING btree ("actor");--> statement-breakpoint
CREATE INDEX "idx_360_players_keeper" ON "three_sixty_players" USING btree ("keeper");--> statement-breakpoint
CREATE INDEX "idx_360_players_location" ON "three_sixty_players" USING btree ("location_x","location_y");