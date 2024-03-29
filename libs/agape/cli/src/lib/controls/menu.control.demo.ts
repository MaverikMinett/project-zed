import { CliMenuControl } from "../controls/menu.control"
import { describe, expect, it } from "@agape/demo"
import { Menu } from "@agape/menu"


describe('CliMenuControl', 'interactive', () => {

    it('should instantiate', () => {
        const m = new Menu()
        .item('Menu Option 1')
        .item('Menu Option 2')
        .item('Menu Option 3')
        const c = new CliMenuControl(m)
        expect(c).toBeTruthy()
    })

    it('should run', async () => {
        const m = new Menu()
        .item('Menu Option 1')
        .item('Menu Option 2')
        .item('Menu Option 3')
        const c = new CliMenuControl(m)
        const response = await c.run()
        console.log( 'Selected', response )
    })

})