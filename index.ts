import {action, autorun, computed, extendObservable, intercept, observable, toJS} from "mobx"
import {clone, diff, patch, inverse} from "jiff"

window["toJS"] = toJS

interface ILoggableParams {  
  revisions: any[],
  last: any,
  step: number,
  disposer: any,
  canUndo: boolean,
  canRedo: boolean
}

export interface ILoggableObject {
  __loggable__: ILoggableParams
}



/**
* object.__loggable__ = new LoggableParams()
*/
class LoggableParams {
  
  @observable canUndo: boolean = false
  @observable canRedo: boolean = false
  
  revisions = []
  last = null
  step = 0
  
  disposer = () => {} 
}




/**
 * Turns an object of type T into a Loggable object of type T & ILoggableObject
 * and starts logging
 */
export function loggable<T>(obj: T): T & ILoggableObject {
  
  const loggable: ILoggableObject & T = makeLoggable<T>(obj)
  
  run(loggable)
  
  return loggable
}

/**
* Turns an object into a loggable object
*/
function makeLoggable<T>(obj: T): T & ILoggableObject {
  const ext = obj as any
  
  Object.defineProperty(ext, "__loggable__", {
    enumerable: false,
    value: new LoggableParams()
  })
  
  const typed = obj as T & ILoggableObject
  
  typed.__loggable__.last = getState(obj)
  
  return typed
}

  
/**
* Returns object state (serializer)
*/
function getState(obj: any): any {
  const state: any = clone( toJS(obj) ) 
  return state
}

window["getState"] = getState

/**
* Checks and sets if undo/redo is possibe
*/
function setUndoRedo(obj: ILoggableObject): void {
  obj.__loggable__.canUndo = canUndo(obj)
  obj.__loggable__.canRedo = canRedo(obj)
}


/**
* Start the process of logging
*/
export function run(loggable: ILoggableObject, skipFirstRun: boolean = false): void {
  
  let firstRun: boolean = skipFirstRun

  const instance = autorun( instance => {

    //get new state
    const state: any = getState(loggable)
    
    //set disposer
    loggable.__loggable__.disposer = instance

    if(firstRun) {
      firstRun = false
      return
    }
    
    //calculate difference
    const difference = diff(loggable.__loggable__.last, state)
    
    //set last state to current state
    loggable.__loggable__.last = state
    
    //slice revisions up to the current step
    loggable.__loggable__.revisions = loggable.__loggable__.revisions.slice(0, loggable.__loggable__.step)
    
    //increment step
    loggable.__loggable__.step = loggable.__loggable__.step + 1
    
    //push revision
    loggable.__loggable__.revisions.push(difference)
    
    //set undo/redo possibility
    setUndoRedo(loggable)
    
  
  })

}


export function undo(obj: ILoggableObject) {
  
  const state: any = obj.__loggable__.last
  const undiff = inverse( obj.__loggable__.revisions[obj.__loggable__.step - 1] )
  const newState = patch(undiff, state)

  obj.__loggable__.disposer.dispose()
  
  extendObservable(obj, newState)

  obj.__loggable__.step = obj.__loggable__.step - 1
  obj.__loggable__.last = newState
  
  //set undo/redo possibility
  setUndoRedo(obj)
  
  //run and skip the first run cycle
  run(obj, true)

}



export function redo(obj: ILoggableObject) {
  
  const state: any = obj.__loggable__.last
  const difference = obj.__loggable__.revisions[obj.__loggable__.step]
  const newState = patch(difference, state)
  
  obj.__loggable__.disposer.dispose()
  
  extendObservable(obj, newState)
  obj.__loggable__.step = obj.__loggable__.step + 1
  obj.__loggable__.last = newState
  
  //set undo/redo possibility
  setUndoRedo(obj)
  
  //run and skip the first run cycle
  run(obj, true)
}

export function canUndo(obj: ILoggableObject): boolean {
  return obj.__loggable__.step > 1 ? true : false
}

export function canRedo(obj: ILoggableObject): boolean {
  return obj.__loggable__.step < obj.__loggable__.revisions.length ? true : false
}


export class Loggable implements ILoggableObject {
  
  __loggable__ = new LoggableParams()

  
  constructor() {
    //hide it
    Object.defineProperty(this, "__loggable__", { enumerable: false })

    this.__loggable__.last = getState(this)
  }
  
  initLogger() {
    run(this)
  }
  
  @computed 
  get canUndo(): boolean {
    return this.__loggable__.canUndo
  }
  
  @computed 
  get canRedo(): boolean {
    return this.__loggable__.canRedo
  }
  
  @action
  undo = (): void => undo(this)
  
  @action
  redo = (): void => redo(this)
  
}


window["canRedo"] = canRedo












