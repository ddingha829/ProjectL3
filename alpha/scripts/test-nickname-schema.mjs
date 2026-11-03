import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=await PGlite.create();
try{
 await db.exec(`create role authenticated;create role anon;create schema l2u_private;
 create table public.l2u_schema_migrations(version integer primary key);
 create table public.l2u_profiles(id integer primary key,name text not null check(char_length(name) between 1 and 30));
 insert into public.l2u_profiles values(1,'기존의긴닉네임유지'),(2,'짧은이름');`);
 await db.exec(await fs.readFile('supabase/migrations/20261103_013_nickname_length.sql','utf8'));
 const name=async id=>(await db.query('select name from public.l2u_profiles where id=$1',[id])).rows[0].name;
 const update=(id,value)=>db.query('update public.l2u_profiles set name=$2 where id=$1',[id,value]);
 assert.equal(await name(1),'기존의긴닉네임유지');
 await update(1,'기존의긴닉네임유지');
 assert.equal(await name(1),'기존의긴닉네임유지');
 await assert.rejects(()=>update(1,'새롭게긴닉네임차단'),/6자/);
 assert.equal(await name(1),'기존의긴닉네임유지');
 await update(1,'가나다라마바');assert.equal(await name(1),'가나다라마바');
 await assert.rejects(()=>update(2,'가나다라마바사'),/6자/);
 await update(2,'🌿'.repeat(6));assert.equal(await name(2),'🌿'.repeat(6));
 await assert.rejects(()=>update(2,'🌿'.repeat(7)),/6자/);
 await update(2,'\u1100\u1161'.repeat(6));
 assert.equal((await name(2)).normalize('NFC'),'가'.repeat(6));
 await db.query('insert into public.l2u_profiles values(3,$1)',['자동계정초기표시이름']);
 assert.equal(await name(3),'자동계정초기표시이름');
 assert.equal((await db.query('select version from public.l2u_schema_migrations')).rows[0].version,13);
 console.log(JSON.stringify({status:'passed',checks:12,liveRequests:0}));
}finally{await db.close();}
