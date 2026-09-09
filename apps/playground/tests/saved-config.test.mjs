import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/config.ts';
import { SAVED_CONFIG_KEY, readSavedConfig, saveConfig, deleteSavedConfig, readPlaygroundState } from '../src/saved-config.ts';

const fixture = () => {
  const data = new Map([['unrelated', 'keep']]);
  return { data, storage: () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) }) };
};

test('saving and loading retains normalized optical and rim configuration', () => {
  const {storage} = fixture();
  const state = {...initialState, rimLight: {...initialState.rimLight, onLeave:'hold', width:3}};
  assert.equal(readSavedConfig(storage).state,null);
  assert.equal(saveConfig(state,storage),null);
  assert.deepEqual(readSavedConfig(storage),{state,exists:true,error:null});
});

test('saving replaces the single slot and deleting preserves unrelated storage', () => {
  const {storage,data}=fixture();
  saveConfig(initialState,storage);
  saveConfig({...initialState,background:'alpine'},storage);
  assert.equal(readSavedConfig(storage).state.background,'alpine');
  assert.equal(deleteSavedConfig(storage),null);
  assert.equal(readSavedConfig(storage).exists,false);
  assert.equal(data.get('unrelated'),'keep');
});

test('uploaded image selection is not persisted as a broken local reference', () => {
  const {storage}=fixture();
  saveConfig({...initialState,background:'custom'},storage);
  assert.equal(readSavedConfig(storage).state.background,'spectrum');
});

test('corrupt saved data cannot crash the playground or load as a fake success', () => {
  const {storage,data}=fixture();
  for(const raw of ['{','null','[]','{}','{"settings":[]}']) {
    data.set(SAVED_CONFIG_KEY,raw);
    const result=readSavedConfig(storage);
    assert.equal(result.state,null);assert.equal(result.exists,true);assert.ok(result.error);
  }
});

test('denied storage and quota errors return useful failures', () => {
  const blocked=()=>{throw new Error('denied');};
  assert.ok(readSavedConfig(blocked).error);
  assert.ok(saveConfig(initialState,blocked));
  assert.ok(deleteSavedConfig(blocked));
  assert.ok(saveConfig(initialState,()=>({setItem(){throw new Error('quota');}})));
});

 test('saved settings restore only without an explicit config query', () => {
  const {storage}=fixture();
  const saved={...initialState,background:'alpine'};
  saveConfig(saved,storage);
  assert.deepEqual(readPlaygroundState('',storage),saved);
  const link='?config='+encodeURIComponent(JSON.stringify({...initialState,background:'dunes'}));
  assert.equal(readPlaygroundState(link,storage).background,'dunes');
  assert.deepEqual(readSavedConfig(storage).state,saved);
  assert.deepEqual(readPlaygroundState('?config={',storage),initialState);
  assert.deepEqual(readPlaygroundState('?config=',storage),initialState);
});

 test('missing or unavailable saved state falls back to the owner defaults', () => {
  const {storage}=fixture();
  assert.deepEqual(readPlaygroundState('',storage),initialState);
  assert.deepEqual(readPlaygroundState('',()=>{throw new Error('denied');}),initialState);
});
