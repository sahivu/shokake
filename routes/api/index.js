'use strict'
const validate=true;
const pg = require('pg');
const connectString = 'postgres://postgres:123451@localhost:5432/ShokakeDB'
const Client = new pg.Client(connectString); Client.connect()
const DBTables = {
    users:()=>Client.query(`CREATE TABLE Users (
        UID serial PRIMARY KEY , 
        nickname VARCHAR(255) NOT NULL , 
        status VARCHAR(255) NOT NULL , 
        description VARCHAR(255) NOT NULL 
    )`),
    actionstype:async ()=>{
        await Client.query(`CREATE TABLE ActionsType (
            ATID serial PRIMARY KEY ,
            ActionName VARCHAR(127) NOT NULL 
        ) `)
        return await Client.query(`INSERT INTO ActionsType (ATID, ActionName)
        VALUES (1, 'Created'), (2, 'Fully Updated'), 
                (3, 'Nickname Updated'), (4, 'Status Updated'), 
                (5, 'Description Updated');`)
    },
    actionshistory:()=>Client.query(`CREATE TABLE ActionsHistory (
        TID serial PRIMARY KEY ,
        UID integer REFERENCES Users(UID),
        ATID integer REFERENCES ActionsType(ATID),
        TTime timestamp default current_timestamp
    )`),
    datarowshistorystore:()=>Client.query(`CREATE TABLE DataRowsHistoryStore (
        TID integer REFERENCES ActionsHistory(TID) PRIMARY KEY , 
        nickname VARCHAR(255), 
        status VARCHAR(255), 
        description VARCHAR(255) 
    ) `),
    updatedcolhistorystore:()=>Client.query(`CREATE TABLE UpdatedColHistoryStore (
        TID integer REFERENCES ActionsHistory(TID) PRIMARY KEY , 
        _value_ VARCHAR(255) NOT NULL 
    ) `)
}
let rr = ';l';
let rr_ = ';s';
let _rr = ';t';
validate&&Client.query('SELECT table_name FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = \'BASE TABLE\'').then(({rows})=>{
    rows = rows.filter(({table_name})=>!(table_name.startsWith('pg')||table_name.startsWith('sql')))
                .map(({table_name})=>table_name);
    rr_ = rows;
    _rr = Object.entries(DBTables).map(([Name,])=>Name);
    rr = Object.entries(DBTables)
                .filter(([Name,])=>rows.indexOf(Name)===-1);
    rr.map(([Name,Creator])=>Creator());
})
validate&&Client.query(`CREATE OR REPLACE PROCEDURE CREATE_USER(Nick VARCHAR(255))
LANGUAGE plpgsql
AS $$
DECLARE
user_id integer;
action_transaction_id integer;
BEGIN
    INSERT INTO Users(nickname, status, description) VALUES (Nick, 'green member', '') RETURNING UID INTO user_id;
    INSERT INTO ActionsHistory(UID, ATID) VALUES (user_id, 1) RETURNING TID INTO action_transaction_id;
    INSERT INTO DataRowsHistoryStore(TID, nickname, status, description) VALUES (action_transaction_id , Nick, 'green member', '');
END;$$`)
validate&&Client.query(`CREATE OR REPLACE PROCEDURE UPDATE_USER_COL(
	user_id integer,
	_value VARCHAR(255),
	col_id integer
) LANGUAGE plpgsql
AS $$
DECLARE
	action_transaction_id integer;
BEGIN
	IF col_id < 2 and col_id > 6 THEN
		RAISE EXCEPTION 'Column With col_id not found';
	END IF;
	IF col_id = 4 then
		UPDATE Users SET status = _value WHERE UID = user_id;
	ELSIF  col_id = 3 then
		UPDATE Users SET nickname = _value WHERE UID = user_id;
	ELSIF  col_id = 5 then
		UPDATE Users SET description = _value WHERE UID = user_id;
	END IF;
	INSERT INTO ActionsHistory(UID, ATID) VALUES (user_id, col_id) RETURNING TID INTO action_transaction_id;
    INSERT INTO UpdatedColHistoryStore(TID, _value_) VALUES (action_transaction_id, _value);
END;$$`)
validate&&Client.query(`CREATE OR REPLACE FUNCTION getAHPageOffset() 
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
	rowscount integer;
Begin
	SELECT count(*) INTO rowscount from ActionsHistory;
	if(rowscount % 15 = 0) then
		RETURN (rowscount/15)-1;
	END IF;
	RETURN rowscount/15;
END;$$`)
/*
CREATE TABLE Users (
    UID serial PRIMARY KEY , 
    nickname VARCHAR(255) NOT NULL , 
    status VARCHAR(255) NOT NULL , 
    description VARCHAR(255) NOT NULL 
) 
CREATE TABLE ActionsType (
    ATID serial PRIMARY KEY ,
    ActionName VARCHAR(127) NOT NULL 
) 
INSERT INTO ActionsType (ATID, ActionName)
    VALUES (1, 'Created'), (2, 'Fully Updated'), (3, 'Nickname Updated'), (4, 'Status Updated'), (5, 'Description Updated');
CREATE TABLE ActionsHistory (
    TID serial PRIMARY KEY ,
    UID integer REFERENCES Users(UID),
    ATID integer REFERENCES ActionsType(ATID),
    TTime timestamp default current_timestamp
) 
CREATE TABLE DataRowsHistoryStore (
    TID integer REFERENCES ActionsHistory(TID) PRIMARY KEY , 
    nickname VARCHAR(255), 
    status VARCHAR(255), 
    description VARCHAR(255) 
) 
CREATE TABLE UpdatedColHistoryStore (
    TID integer REFERENCES ActionsHistory(TID) PRIMARY KEY , 
    _value_ VARCHAR(255) NOT NULL 
) 
CREATE OR REPLACE PROCEDURE CREATE_USER(Nick VARCHAR(255))
LANGUAGE plpgsql
AS $$
DECLARE
user_id integer;
action_transaction_id integer;
BEGIN
    INSERT INTO Users(nickname, status, description) VALUES (Nick, 'green member', '') RETURNING UID INTO user_id;
    INSERT INTO ActionsHistory(UID, ATID) VALUES (user_id, 1) RETURNING TID INTO action_transaction_id;
    INSERT INTO DataRowsHistoryStore(TID, nickname, status, description) VALUES (action_transaction_id , Nick, 'green member', '');
END;$$
CREATE OR REPLACE PROCEDURE UPDATE_USER_COL(
	user_id integer,
	_value VARCHAR(255),
	col_id integer
) LANGUAGE plpgsql
AS $$
DECLARE
	action_transaction_id integer;
BEGIN
	IF col_id < 2 and col_id > 6 THEN
		RAISE EXCEPTION 'Column With col_id not found';
	END IF;
	IF col_id = 4 then
		UPDATE Users SET status = _value WHERE UID = user_id;
	ELSIF  col_id = 3 then
		UPDATE Users SET nickname = _value WHERE UID = user_id;
	ELSIF  col_id = 5 then
		UPDATE Users SET description = _value WHERE UID = user_id;
	END IF;
	INSERT INTO ActionsHistory(UID, ATID) VALUES (user_id, col_id) RETURNING TID INTO action_transaction_id;
    INSERT INTO UpdatedColHistoryStore(TID, _value_) VALUES (action_transaction_id, _value);
END;$$
CREATE OR REPLACE FUNCTION getAHPageOffset() 
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
	rowscount integer;
Begin
	SELECT count(*) INTO rowscount from ActionsHistory;
	if(rowscount % 15 = 0) then
		RETURN (rowscount/15)-1;
	END IF;
	RETURN rowscount/15;
END;$$
*/ 
const sleep = ms => new Promise(r => setTimeout(r, ms));
let min_tid = 0;
let last_tid = 0;
Client.query('SELECT tid from ActionsHistory OFFSET (SELECT count(*)-1 from ActionsHistory)').then(({rows})=>(last_tid = (min_tid = rows[0].tid)));
const updates = [];
let ResUpd
let updPromLine;
function tea() {
	updPromLine=new Promise(r=>ResUpd=r)
	updPromLine.then(tea)
}
tea();
// const statistic = {
//     min_tid: 0
// };
let uq_count = 0;
// const listeners = {};
// class listener {
//     __lastrequesttime
//     current_tid
//     constructor(){}
// };
// const genAT = ()=>Math.random().toString(36).slice(2,17);
let execChain = Promise.resolve()
function checkRows(rows) {
    const [fts, lts] = [rows.at(0).tid, rows.at(-1).tid];
    const _bts = fts > lts ? fts : lts;
    const update = _bts > min_tid ? _bts > last_tid : false;
    let _upd;
    if(update) {
        const upd = rows.filter(({tid})=>tid>last_tid);
        _upd = upd
        upd.map(x=>updates[x.tid]=x);
        last_tid = _bts;
        ResUpd(last_tid);
    }
    return {_ts:_bts, lts,
            nts:last_tid,
            _upd, update
        };
}
async function updateSended(clts, cuqc) {
    console.log(clts, cuqc);
    execChain=execChain.then(_=>sleep(100))
        .then(async x=>{
                console.log(last_tid-clts);
                if(!(last_tid-clts>=cuqc)) {
                    //updatesrequest
                    const {rows} = await Client.query(`
                    SELECT ActionsHistory.TID, 
                        Users.UID, Users.nickname AS ActualNickname,
                        ActionsHistory.ATID, ActionsType.ActionName,
                        UpdatedColHistoryStore._value_,
                        DataRowsHistoryStore.nickname, DataRowsHistoryStore.status, DataRowsHistoryStore.description
                        from ActionsHistory 
                    LEFT JOIN UpdatedColHistoryStore ON UpdatedColHistoryStore.TID = ActionsHistory.TID
                    LEFT JOIN DataRowsHistoryStore ON DataRowsHistoryStore.TID = ActionsHistory.TID
                    INNER JOIN ActionsType ON ActionsType.ATID = ActionsHistory.ATID
                    INNER JOIN Users ON Users.UID = ActionsHistory.UID
                    WHERE ActionsHistory.TID > ${last_tid}`);
                    checkRows(rows);
                } else {
                    //well
                }
            });
}
module.exports = async function (fastify, opts) {
  fastify.get('/', async function (request, reply) {
    return {};
  })
  fastify.get('/pool', async function (request, reply) {
    const {ts} = request.query;
    if(ts !== undefined) {
        if(isNaN(+ts) || +ts < 0 || +ts === Infinity || +ts < min_tid) return {error:`'ts' is invalid`, nts:+last_tid};
        if(+ts < last_tid) {
            return {
                _ts:+ts,
                nts: last_tid,
                rows:updates.slice(+ts+1),
                updates,
            };
        } else {
            return new Promise(resolve=>{
                updPromLine.then(_=>resolve({
                    _ts:+ts,
                    nts: last_tid,
                    rows:updates.slice(+ts+1),
                    updates,
                }));
                setTimeout(_=>resolve({lst__:last_tid}),3000)
            });
        }
    }
    const rr = await Client.query('SELECT count(*) AS count, getAHPageOffset() AS pagescount from ActionsHistory');
    const {rows} = await Client.query(`
    SELECT ActionsHistory.TID, 
        Users.UID, Users.nickname AS ActualNickname,
        ActionsHistory.ATID, ActionsType.ActionName,
        UpdatedColHistoryStore._value_,
        DataRowsHistoryStore.nickname, DataRowsHistoryStore.status, DataRowsHistoryStore.description
        from ActionsHistory 
    LEFT JOIN UpdatedColHistoryStore ON UpdatedColHistoryStore.TID = ActionsHistory.TID
    LEFT JOIN DataRowsHistoryStore ON DataRowsHistoryStore.TID = ActionsHistory.TID
    INNER JOIN ActionsType ON ActionsType.ATID = ActionsHistory.ATID
    INNER JOIN Users ON Users.UID = ActionsHistory.UID
        ORDER BY ActionsHistory.TID
        LIMIT 15 Offset (SELECT getAHPageOffset()*15)
    `);
    const {_ts, nts} = checkRows(rows);
    const {count, pagescount} = (await rr).rows[0];
    return { count, pagescount, rows, _ts, nts};
  })
  fastify.get('/getpage', async function (request, reply) {
    const {page} = request.query;
    if(isNaN(+page) || +page < 0 || +page === Infinity) return {error:`'page' is invalid`};
    const {rows} = await Client.query(`
    SELECT ActionsHistory.TID, 
        Users.UID, Users.nickname AS ActualNickname,
        ActionsHistory.ATID, ActionsType.ActionName,
        UpdatedColHistoryStore._value_,
        DataRowsHistoryStore.nickname, DataRowsHistoryStore.status, DataRowsHistoryStore.description
        from ActionsHistory 
    LEFT JOIN UpdatedColHistoryStore ON UpdatedColHistoryStore.TID = ActionsHistory.TID
    LEFT JOIN DataRowsHistoryStore ON DataRowsHistoryStore.TID = ActionsHistory.TID
    INNER JOIN ActionsType ON ActionsType.ATID = ActionsHistory.ATID
    INNER JOIN Users ON Users.UID = ActionsHistory.UID
    ORDER BY ActionsHistory.TID
        LIMIT 15 Offset (SELECT ${page}*15)
    `);
    const {_ts, nts, _upd, lts, update} = checkRows(rows);
    return {rows, _ts,lts, nts, _upd,update};
  })
  fastify.get('/userinfo', async function (request, reply) {
    const {uid=NaN} = request.query;
    if(isNaN(+uid) || +uid === 0 || +uid === Infinity || +uid === -Infinity) return {error:`'uid' is invalid`};
    const {rows, rowCount} = await Client.query(`SELECT * FROM Users WHERE Users.UID = ${+uid};`);
    if(!rowCount) return {error:`User by ${+uid} not found`}
    return rows[0];
  })
  fastify.get('/userhistory', async function (request, reply) {
    const {uid=NaN} = request.query;
    if(isNaN(+uid) || +uid === 0 || +uid === Infinity || +uid === -Infinity) return {error:`'uid' is invalid`};
    const {rows, rowCount} = await Client.query(`
    SELECT ActionsHistory.TID, 
        Users.UID, Users.nickname AS ActualNickname,
        ActionsHistory.ATID, ActionsType.ActionName,
        UpdatedColHistoryStore._value_,
        DataRowsHistoryStore.nickname, DataRowsHistoryStore.status, DataRowsHistoryStore.description
        from ActionsHistory 
    LEFT JOIN UpdatedColHistoryStore ON UpdatedColHistoryStore.TID = ActionsHistory.TID
    LEFT JOIN DataRowsHistoryStore ON DataRowsHistoryStore.TID = ActionsHistory.TID
    INNER JOIN ActionsType ON ActionsType.ATID = ActionsHistory.ATID
    INNER JOIN Users ON Users.UID = ActionsHistory.UID
        WHERE ActionsHistory.UID = ${+uid} 
        ORDER BY tid DESC`);
    return rows;
  })
  fastify.get('/createuser', async function (request, reply) {
    const {nickname} = request.query;
    if(!nickname) return {err:'invalid nickname'}
    if(nickname==='') return {err:'empty nickname'}
        const res = await Client.query({
            rowMode: 'array',
            text: 'CALL CREATE_USER($1);',
            values: [nickname]
        });
    const clts = last_tid;
    const cuqc = (++uq_count);
    updateSended(clts, cuqc);
    return {success:{
        nickname
    }};
  })
  fastify.get('/useredit', async function (request, reply) {
    const {uid, nickname, staus, description} = request.query;
    if(isNaN(+uid) || +uid === 0 || +uid === Infinity || +uid === -Infinity) return {error:`'uid' is invalid`};
    const actionid = nickname ? 3 : staus ? 4 : description ? 5 : null;
    if(!actionid) return {err:'haven,t property to update'}
    const _value_  = nickname ? nickname : staus ? staus : description;
    try {
        const res = await Client.query({
            rowMode: 'array',
            text: 'CALL UPDATE_USER_COL($1,$2,$3);',
            values: [+uid, _value_, actionid]
        })//UPDATE_USER_COL
    } catch(e) {
        return {err:'user not found'}
    }
    const clts = last_tid;
    const cuqc = (++uq_count);
    updateSended(clts, cuqc);
    return {success:{
        uid,
        nickname, staus, description
    }};
  })
  fastify.get('/tables', async function (request, reply) {
    return {
            rr, rr_,_rr
        };
  })
}