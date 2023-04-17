import { Expect } from "./expect"
import { activeTestSuite, closeSuite, openSuite, rootSuite } from "./private" 
import { TestCaseParams, TestSuiteParams } from "./test-suite"

export { rootSuite } from './private';

export function describe( description: string, interactive: 'interactive', suiteBuilder: ( ...args: any[] ) => void ): void
export function describe( description: string, suiteBuilder: ( ...args: any[] ) => void, params: TestSuiteParams ): void
export function describe( description: string, suiteBuilder: ( ...args: any[] ) => void ): void
export function describe( ...args:any[] ): void {

    let interactiveOption: boolean
    const description: string = args[0]
    let suiteBuilder: Function
    let params: TestSuiteParams
    if ( args[1] === 'interactive' ) {
        interactiveOption = true
        suiteBuilder = args[2]
        params = args[2]
    }
    else {
        suiteBuilder = args[1]
        params = args[2]
    }

    const suite = activeTestSuite().describe( description, params )
    if ( interactiveOption ) suite.interactive = true
    openSuite(suite)
    suiteBuilder.call(undefined)
    closeSuite()
}

export function fdescribe( description: string, interactive: 'interactive', suiteBuilder: ( ...args: any[] ) => void ): void
export function fdescribe( description: string, suiteBuilder: ( ...args: any[] ) => void, params: TestSuiteParams ): void
export function fdescribe( description: string, suiteBuilder: ( ...args: any[] ) => void ): void
export function fdescribe( ...args:any[] ): void {

    let interactiveOption: boolean
    const description: string = args[0]
    let suiteBuilder: Function
    let params: TestSuiteParams
    if ( args[1] === 'interactive' ) {
        interactiveOption = true
        suiteBuilder = args[2]
        params = args[2]
    }
    else {
        suiteBuilder = args[1]
        params = args[2]
    }

    const suite = activeTestSuite().fdescribe( description, params )
    if ( interactiveOption ) suite.interactive = true
    openSuite(suite)
    suiteBuilder.call(undefined)
    closeSuite()
}

export function it( description, test: Function, params?: TestCaseParams ) {
    activeTestSuite().it(description, test, params)
}

export function fit( description, test: Function, params?: TestCaseParams  ) {
    activeTestSuite().fit(description, test, params)
}

export function xit( description, test: Function, params?: TestCaseParams  ) {
    activeTestSuite().xit(description, test, params)
}

export async function runtests() {
    console.log("Starting demo test runner")
    return rootSuite().run()
}

export function expect<T>( actual: T ) {
    return new Expect<T>( actual )
}