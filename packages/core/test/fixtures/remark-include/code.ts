//#region a
console.log('hello world');
//#endregion

export function fn() {
  //#region b
  console.log('one');
  //#region c
  return function nested() {
    console.log('two');
    //#endregion
    console.log('three');
  };
  //#endregion
}
