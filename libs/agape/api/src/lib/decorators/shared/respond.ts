import { Class } from '@agape/types'
import { StubDescriptor } from '../../descriptors/stub';
import { Exception } from '@agape/exception';

export function Respond(model: Class|Exception|[Class], description?: string ) {

    return function Respond( target:any, name: string, typedPropertyDescriptor: TypedPropertyDescriptor<Function> ) {

        const stub: StubDescriptor = StubDescriptor.descriptor(target, true)

        stub.action(name).respond(model, description)

        return target
    }

}

