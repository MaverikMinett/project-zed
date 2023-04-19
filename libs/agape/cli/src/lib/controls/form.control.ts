import { FormGroup } from "@agape/forms";
import { CliElement } from "../element";
import { CliInputControl } from "./input.control";



export class CliFormControl extends CliElement {

    constructor( public form: FormGroup ) {
        super()
    }

    async run() {
        for ( let field of this.form.fields ) {
            const control = new CliInputControl( field.label )
            control.value = this.form.value && field.name in this.form.value
                ? this.form.value[field.name] 
                : control.value
            const response = await control.run()
            this.form.value[field.name] = response   
        }
        return this.form.value
    }
}