import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
const db=await PGlite.create();const ids=[1,2,3,4].map(n=>`00000000-0000-4000-8000-00000000000${n}`),group='10000000-0000-4000-8000-000000000001';
try{
 await db.exec(`create role authenticated;create role anon;create role service_role bypassrls;create schema auth;create schema l2u_private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,l2u_private to authenticated,anon,service_role;
 create table public.l2u_profiles(id uuid primary key,name text,color text,created_at timestamptz default '2026-11-01');
 create table public.l2u_groups(id uuid primary key,archived boolean default false,created_at timestamptz default '2026-11-01');
 create table public.l2u_members(group_id uuid,user_id uuid,active boolean,joined_at timestamptz default '2026-11-01');
 create table public.l2u_logs(id uuid primary key,author_id uuid,payload jsonb,published_at timestamptz);
 create table public.l2u_shares(log_id uuid,group_id uuid,shared_at timestamptz default '2026-11-10');
 create table public.l2u_schema_migrations(version integer primary key);
 create function l2u_private.member(g uuid) returns boolean language sql security definer set search_path='' as $$select exists(select 1 from public.l2u_members where group_id=g and user_id=auth.uid() and active)$$;`);
 await db.exec(await fs.readFile('supabase/migrations/20261108_017_monthly_kingdom.sql','utf8'));
 for(const [i,id]of ids.entries())await db.query('insert into public.l2u_profiles(id,name,color) values($1,$2,$3)',[id,'member'+i,'#123456']);
 await db.query('insert into public.l2u_groups(id) values($1)',[group]);
 for(const id of ids.slice(0,3))await db.query('insert into public.l2u_members(group_id,user_id,active) values($1,$2,true)',[group,id]);
 for(let i=0;i<5;i++){
  const id=`20000000-0000-4000-8000-00000000000${i}`;
  await db.query('insert into public.l2u_logs values($1,$2,$3,$4)',[id,ids[i===2?1:0],JSON.stringify({work:{id:i<3?'same':String(i),kind:i===3?'music':'book',title:'Book',image:'data:image/png;base64,private'}}),i===4?'2026-11-30T15:00:00Z':'2026-11-20T00:00:00Z']);
  await db.query('insert into public.l2u_shares(log_id,group_id) values($1,$2)',[id,group]);
 }
 await db.query("select l2u_private.seal_kingdom_month('2026-12-01T00:00:00+09')");
 const result=(await db.query('select payload from public.l2u_kingdom_months where group_id=$1',[group])).rows[0].payload;
 assert.deepEqual(result.counts,{castle:3,book:2,music:1,movie:0});assert.equal(result.members,3);assert.equal(result.records.length,4);assert.equal(result.records.every(r=>!r.image),true);assert.equal(result.people.length,3);
 assert.equal((await db.query('select payload from public.l2u_kingdom_months where owner_id=$1',[ids[2]])).rows[0].payload.counts.castle,0);
 const initial=JSON.stringify(result);await db.exec('delete from public.l2u_logs');await db.exec("select l2u_private.seal_kingdom_month('2026-12-02')");assert.equal(JSON.stringify((await db.query('select payload from public.l2u_kingdom_months where group_id=$1',[group])).rows[0].payload),initial);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[0]]);await db.exec('set role authenticated');
 assert.equal((await db.query('select public.l2u_kingdom_archive($1) as a',[group])).rows[0].a.months.length,1);
 assert.equal((await db.query('select public.l2u_kingdom_archive() as a')).rows[0].a.months.length,1);
 await assert.rejects(()=>db.exec('delete from public.l2u_kingdom_months'));await assert.rejects(()=>db.exec('select l2u_private.seal_kingdom_month()'));
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[ids[3]]);await assert.rejects(()=>db.query('select public.l2u_kingdom_archive($1)',[group]));assert.equal((await db.query('select * from public.l2u_kingdom_months where group_id=$1',[group])).rows.length,0);
 await db.exec('reset role;set role anon');await assert.rejects(()=>db.exec('select public.l2u_kingdom_archive()'));
 console.log('PASS kingdom SQL: deduplication, month cutoff, member count, zero-XP keepsakes, immutable archives, no blob duplication and member-only authorization');
}finally{await db.close();}
