import { Class } from "@agape/types"

export class Buildable {

    Δdecorate( target:Class ) {
        return class extends target {
            constructor( ...args ) {
                super(...args)

                // console.log( "Building ", ...args )

            }   
        }
    }

}

