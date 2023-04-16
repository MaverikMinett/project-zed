

import { AssertionError } from 'assert'
import { Expect } from './expect'

describe('Expect', () => {

    let e: Expect<any>
    let a: any

    beforeEach( () => {
        e = undefined
        a = undefined
    })

    it('should not assert', () => {
        a = true
        e = new Expect(a)
        e.toBe(true)
    })
    describe('toBe', () => {
        it('should assert', () => {
            a = true
            e = new Expect(a)
            try {
                e.toBe(false)
            }
            catch ( error ) {
                expect(error).toBeInstanceOf(AssertionError)
            }
        })
    })
    describe('toEqual', () => {
        it('should ot assert', () => {
            a = { 'a': 'foo', 'b': 'bar '}
            e = new Expect(a)
            e.toEqual({ 'a': 'foo', 'b': 'bar '})
        })
        it('should assert', () => {
            a = { 'a': 'foo', 'b': 'bar '}
            e = new Expect({ 'c': 'biz', 'd': 'baz '})
            try {
                e.toEqual(false)
            }
            catch ( error ) {
                expect(error).toBeInstanceOf(AssertionError)
            }
        })
    })

})