create table users(
     user_id uuid primary key,
     email varchar(255) not null unique,
     password_hash varchar(255) not null,
     created_at timestamptz default NOW()
);
