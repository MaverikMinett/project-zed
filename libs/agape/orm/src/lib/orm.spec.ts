import { Document, Field, Model, Primary, View, ForeignKey } from '@agape/model';
import { MongoConnection } from './connections/mongo.connection';
import { MongoDatabase } from './databases/mongo.database';
import { Orm } from './orm'

const DATABASE_URL = 'mongodb://localhost:27017';
const DATABASE_NAME = 'foo'


describe('Orm', () => {

    let orm = new Orm()
    let connection = new MongoConnection(DATABASE_URL);
    let database = new MongoDatabase(connection, DATABASE_NAME)
    beforeEach( async () => {
        connection = new MongoConnection(DATABASE_URL);

        await connection.connect()
        database = new MongoDatabase(connection, DATABASE_NAME)

        orm = new Orm()
        orm.debug = true
        orm.registerDatabase('default', database)
    })

    afterEach( async () => {
        const foos = database.getCollection('foos')
        await foos.deleteMany({})

        const bars = database.getCollection('bars')
        await bars.deleteMany({})

        const users = database.getCollection('users')
        await users.deleteMany({})

        const shifts = database.getCollection('shifts')
        await shifts.deleteMany({})

        await connection.disconnect()
    })

    describe('registerDocument', () => {
        it('should register a document (no params)', async () => {
            @Model class Foo extends Document {
        
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }

            orm.registerDocument(Foo)
            
            const locator = orm.getLocator(Foo)
            expect(locator).toBeTruthy()
            expect(locator.databaseName).toBe('default')
            expect(locator.collectionName).toBe('foos')
            expect(locator.collection).toBeTruthy()
        })  
        it('should register a document (with collectionName param)', async() => {
            @Model class Foo extends Document {
        
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }

            orm.registerDocument(Foo, { collectionName: 'bars' })
            
            const locator = orm.getLocator(Foo)
            expect(locator.collectionName).toBe('bars')
            expect(locator.collection).toBeTruthy()
        })
        it('should not allow two documents to be mapped to the same collection', async() => {
            @Model class Foo extends Document {
        
                @Primary id: string
                @Field name: string
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }

            @Model class Bar extends Document {
                @Primary id: string
                @Field name: string
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }

            orm.registerDocument(Foo, { collectionName: 'foos' })

            expect( () => orm.registerDocument(Bar, { collectionName: 'foos' }) ).toThrowError()
        })
        it('should not register a view', () => {
            @Model class Foo extends Document {
        
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }

            interface FooName extends Pick<Foo,'id'|'name'> { }
            @View(Foo, ['id','name'])
            class FooName extends Document { }

            expect( () => orm.registerDocument(FooName) ).toThrowError()
        })
        it('should not register multiple documents to the same collection', () => {

        })
    })

    describe('InsertQuery', () => {
        it('should insert the foo', async() => {
            @Model class Foo extends Document {
    
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }
    
            const foo = new Foo({ name: "Johnny", age: 42 })
            orm.registerDocument(Foo)

            const { id } = await orm.insert(Foo, foo).exec()
            expect(id).toBeTruthy()
        })
    
        it('should set the id on the foo', async() => {
            @Model class Foo extends Document {
    
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }
    
            const foo = new Foo({ name: "Johnny", age: 42 })
            orm.registerDocument(Foo)
    
            await orm.insert(Foo, foo).exec()
            expect(foo.id).toBeTruthy()
        })
    
        it('should store the id of the bar document', async() => {
            @Model class Bar extends Document {
    
                @Primary id: string
                @Field name: string
                @Field address: string
            
                constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                    super()
                    Object.assign( this, params )
                }
            }
    
            @Model class Foo extends Document {
    
                @Primary id: string
                @Field name: string
                @Field age: number
                @Field bar: Bar
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }
    
            orm.registerDocument(Foo)
            orm.registerDocument(Bar)
    
            const bar = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
            const foo = new Foo({ name: "Johnny", age: 42, bar: bar })
            
            await orm.insert(Bar, bar).exec()
            expect( bar.id ).toBeTruthy()
            
            await orm.insert(Foo, foo).exec()
            expect( foo.id ).toBeTruthy()
        })

        describe('default values', () => {
            it('should set the default value if not defined', async () => {
                @Model class Foo extends Document {
    
                    @Primary id: string
                    @Field name: string
                    @Field({ default: 42 }) age: number
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }
                
                orm.registerDocument(Foo)
        
                const foo = new Foo({ name: "Johnny" })
                await orm.insert(Foo, foo).exec()
                const saved = await orm.retrieve(Foo, foo.id).exec()
                expect(saved.age).toBe(42)
            })
            it('should set the default value from the base model', async () => {
                @Model class Foo extends Document {
    
                    @Primary id: string
                    @Field name: string
                    @Field({ default: 42 }) age: number
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }

                interface FooCreateView extends Pick<Foo, 'id'|'name'> { }
                @View(Foo, { pick: ['id','name'] })
                class FooCreateView extends Document {

                    constructor( params?: Partial<Pick<FooCreateView, keyof FooCreateView>>) {
                        super()
                        Object.assign( this, params )
                    }

                }
                
                orm.registerDocument(Foo)
        
                const foo = new FooCreateView({ name: "Johnny" })
                await orm.insert(FooCreateView, foo).exec()
                const saved = await orm.retrieve(Foo, foo.id).exec()
                expect(saved.age).toBe(42)
            })
        })
    })

    describe('UpdateQuery', () => {
        it('should update the foo using the record id', async() => {
            @Model class Foo extends Document {
    
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }
    
            const foo = new Foo({ name: "Johnny", age: 42 })
            orm.registerDocument(Foo)

            const { id } = await orm.insert(Foo, foo).exec()
            
            foo.age = 55
            await orm.update(Foo, id, foo).exec()
        })
        it('should update the foo using a filter', async() => {
            @Model class Foo extends Document {
    
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }
    
            const foo = new Foo({ name: "Johnny", age: 42 })
            orm.registerDocument(Foo)

            const { id } = await orm.insert(Foo, foo).exec()
            
            foo.age = 55
            await orm.update(Foo, { age: 42 }, foo).exec()

            const retrievedFoo = await orm.retrieve(Foo, id).exec()
            expect(retrievedFoo.age).toBe(55)
        })
        describe('filter by properties not on view', () => {
            it('should specify the document/view as an array', async () => {
                @Model class Foo extends Document {
    
                    @Primary id: string
                    @Field name: string
                    @Field age: number
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }

                interface FooName extends Pick<Foo,'id'|'name'> { }
                @View(Foo, ['id','name']) 
                class FooName extends Document { }
        
                const foo = new Foo({ name: "Johnny", age: 42 })
                orm.registerDocument(Foo)
     
                const { id } = await orm.insert(Foo, foo).exec()

                const bar = await orm.retrieve(FooName, id).exec()
                bar.name = "Jimmy"
                
                await orm.update([Foo,FooName], { age: 42 }, bar).exec()
    
                const retrievedFoo = await orm.retrieve(Foo, id).exec()
                expect(retrievedFoo.name).toBe("Jimmy")
            })
            it('should specify the document/view as an object', async () => {
                @Model class Foo extends Document {
    
                    @Primary id: string
                    @Field name: string
                    @Field age: number
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }

                interface FooName extends Pick<Foo,'id'|'name'> { }
                @View(Foo, ['id','name']) 
                class FooName extends Document { }
        
                const foo = new Foo({ name: "Johnny", age: 42 })
                orm.registerDocument(Foo)
     
                const { id } = await orm.insert(Foo, foo).exec()

                const bar = await orm.retrieve(FooName, id).exec()
                bar.name = "Jimmy"
                
                await orm.update({document: Foo, view: FooName}, { age: 42 }, bar).exec()
    
                const retrievedFoo = await orm.retrieve(Foo, id).exec()
                expect(retrievedFoo.name).toBe("Jimmy")
            })
        })
    })

    describe('UpdateManyQuery', () => {
        it('should update the shifts', async() => {
            @Model class Shift extends Document {
                @Primary id?: string
                @Field timeIn: Date
                @Field timeOut?: Date
            
                constructor( params?: Partial<Pick<Shift, keyof Shift>>) {
                    super()
                    Object.assign( this, params )
                }
            }

            interface ShiftBatchUpdateView extends Pick<Shift, 'timeOut'> { }
            @View(Shift, ['timeOut'])
            class ShiftBatchUpdateView extends Document {
                constructor( params?: Partial<Pick<ShiftBatchUpdateView, keyof ShiftBatchUpdateView>>) {
                    super()
                    Object.assign( this, params )
                }
            }

            orm.registerDocument(Shift)
    
            const shift1 = new Shift({ timeIn: new Date('2012-01-01 17:00:00') })
            const shift2 = new Shift({ timeIn: new Date('2012-01-01 17:30:00') })
            const shift3 = new Shift({ timeIn: new Date('2012-01-01 18:00:00') })

            await orm.insert(Shift, shift1).exec()
            await orm.insert(Shift, shift2).exec()
            await orm.insert(Shift, shift3).exec()

            const changes = new ShiftBatchUpdateView({timeOut: new Date('2012-01-01 21:00:00')})
            await orm.updateMany([Shift,ShiftBatchUpdateView], {timeOut: null}, changes).exec()

            const shifts = await orm.list(Shift).exec()
            for ( const shift of shifts ) {
                expect(shift.timeOut).toEqual( new Date('2012-01-01 21:00:00') )
            }
        })
    })

    describe('RetrieveQuery', () => {
        describe('by id', () => {
            describe('nested documents', () => {
                it('should retrieve the bar document with the foo document', async() => {
                    @Model class Bar extends Document {
            
                        @Primary id: string
                        @Field name: string
                        @Field address: string
                    
                        constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                            super()
                            Object.assign( this, params )
                        }
                    }
            
                    @Model class Foo extends Document {
            
                        @Primary id: string
                        @Field name: string
                        @Field age: number
                        @Field bar: Bar
                    
                        constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                            super()
                            Object.assign( this, params )
                        }
                    }
            
                    orm.registerDocument(Foo)
                    orm.registerDocument(Bar)
            
                    const bar = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                    const foo = new Foo({ name: "Johnny", age: 42, bar: bar })
                    
                    await orm.insert(Bar, bar).exec()
                    await orm.insert(Foo, foo).exec()
            
                    const retrievedFoo = await orm.retrieve(Foo, foo.id).exec()
                    expect(retrievedFoo.bar).toBeTruthy()
                    expect(retrievedFoo.bar.id).toBe(bar.id)
                    expect(retrievedFoo.bar.name).toBe(bar.name)
                    expect(retrievedFoo.bar.address).toBe(bar.address)
                })
            
                it('should retrieve the bar name view with the foo document', async() => {
                    @Model class Bar extends Document {
            
                        @Primary id: string
                        @Field name: string
                        @Field address: string
                    
                        constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                            super()
                            Object.assign( this, params )
                        }
                    }
            
                    interface BarName extends Pick<Bar, 'id'|'name'> { }
                    @View(Bar, ['id', 'name'] ) 
                    class BarName extends Document { }
            
                    @Model class Foo extends Document {
            
                        @Primary id: string
                        @Field name: string
                        @Field age: number
                        @Field bar: BarName
                    
                        constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                            super()
                            Object.assign( this, params )
                        }
                    }
            
                    orm.registerDocument(Foo)
                    orm.registerDocument(Bar)
            
                    const bar = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                    const foo = new Foo({ name: "Johnny", age: 42, bar: bar })
    
                    await orm.insert(Bar, bar).exec()
                    await orm.insert(Foo, foo).exec()
            
                    const retrievedFoo = await orm.retrieve(Foo, foo.id).exec()
                    expect(retrievedFoo.bar).toBeTruthy()
                    expect(retrievedFoo.bar.id).toBe(bar.id)
                    expect(retrievedFoo.bar.name).toBe(bar.name)
                    expect((retrievedFoo.bar as any).address).toBe(undefined)
                })
                it('should allow bar to be undefined', async () => {
                    @Model class Bar extends Document {
            
                        @Primary id: string
                        @Field name: string
                        @Field address: string
                    
                        constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                            super()
                            Object.assign( this, params )
                        }
                    }
            
                    @Model class Foo extends Document {
            
                        @Primary id: string
                        @Field name: string
                        @Field age: number
                        @Field bar: Bar
                    
                        constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                            super()
                            Object.assign( this, params )
                        }
                    }
            
                    orm.registerDocument(Foo)
                    orm.registerDocument(Bar)
            
    
                    const foo = new Foo({ name: "Johnny", age: 42 })
                    
    
                    await orm.insert(Foo, foo).exec()
            
                    const retrievedFoo = await orm.retrieve(Foo, foo.id).exec()
                    expect(retrievedFoo.bar).toBe(null)
                })
                it('should allow bar to be null', async () => {
                    @Model class Bar extends Document {
            
                        @Primary id: string
                        @Field name: string
                        @Field address: string
                    
                        constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                            super()
                            Object.assign( this, params )
                        }
                    }
            
                    @Model class Foo extends Document {
            
                        @Primary id: string
                        @Field name: string
                        @Field age: number
                        @Field bar: Bar
                    
                        constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                            super()
                            Object.assign( this, params )
                        }
                    }
            
                    orm.registerDocument(Foo)
                    orm.registerDocument(Bar)
            
    
                    const foo = new Foo({ name: "Johnny", age: 42, bar: null })
                    
    
                    await orm.insert(Foo, foo).exec()
            
                    const retrievedFoo = await orm.retrieve(Foo, foo.id).exec()
                    expect(retrievedFoo.bar).toBe(null)
                })
            })
        })
        describe('by filter', () => {
            it('should find the user by username', async () => {
                @Model class User extends Document {
                    @Primary id: string;
                    @Field username: string;
    
                    constructor( params?: Partial<Pick<User, keyof User>> ) {
                        super()
                        Object.assign(this, params)
                    }
                }
    
                orm.registerDocument(User)
    
                const user = new User({ username: "foo" })
                await orm.insert(User, user).exec()
                expect(user.id).toBeDefined()
    
                const retrievedUser = await orm.retrieve(User, { username: "foo" }).exec()
                expect(retrievedUser).toBeDefined()
            })
            describe('nested documents', () => {
                it('should have an undefined role', async () => {
                    @Model class Role extends Document {
                        @Primary id: string;
                        @Field name: string;
        
                        constructor( params?: Partial<Pick<Role, keyof Role>> ) {
                            super()
                            Object.assign(this, params)
                        }
                    }
                    @Model class User extends Document {
                        @Primary id: string;
                        @Field username: string;
                        @Field role: Role;
        
                        constructor( params?: Partial<Pick<User, keyof User>> ) {
                            super()
                            Object.assign(this, params)
                        }
                    }
        
                    orm.registerDocument(User)
                    orm.registerDocument(Role)
        
                    const role = new Role({ name: 'registered' })
                    await orm.insert(Role, role).exec()
                    await orm.insert(User, new User({ username: "foo" })).exec()
        
                    const user = await orm.retrieve(User, { username: "foo" }).exec()
                    expect(user).toBeDefined()
                })
                it('should lookup the user', async () => {
                    @Model class Role extends Document {
                        @Primary id: string;
                        @Field name: string;
        
                        constructor( params?: Partial<Pick<Role, keyof Role>> ) {
                            super()
                            Object.assign(this, params)
                        }
                    }
                    @Model class User extends Document {
                        @Primary id: string;
                        @Field username: string;
                        @Field role: Role;
        
                        constructor( params?: Partial<Pick<User, keyof User>> ) {
                            super()
                            Object.assign(this, params)
                        }
                    }
        
                    orm.registerDocument(User)
                    orm.registerDocument(Role)
        
                    const role = new Role({ name: 'registered' })
                    await orm.insert(Role, role).exec()
                    await orm.insert(User, new User({ username: "foo", role })).exec()
        
                    const user = await orm.retrieve(User, { username: "foo" }).exec()
                    expect(user.role).toBeDefined()
                }) 
            })
        })
        describe('by filter with fields not on view', () => {
            it('should lookup the user by role', async () => {

                @Model class Role extends Document {
                    @Primary id: string
                    @Field name: string

                    constructor( params?: Partial<Pick<Role, keyof Role>> ) {
                        super()
                        Object.assign(this, params)
                    }
                }

                @Model class User extends Document {
                    @Primary id: string;
                    @Field username: string;
                    @Field role: Role;
    
                    constructor( params?: Partial<Pick<User, keyof User>> ) {
                        super()
                        Object.assign(this, params)
                    }
                }

                interface UserView extends Pick<User, 'id'|'username'> { }
                @View(User, ['id', 'username'] ) 
                class UserView extends Document { }
    
                orm.registerDocument(Role)
                orm.registerDocument(User)

                const role = new Role({ name: 'bar' })
                await orm.insert(Role, role).exec()

                const user = new User({ username: "foo", role })
                await orm.insert(User, user).exec()
                expect(user.id).toBeDefined()
    
                const retrievedUser = await orm.retrieve([User, UserView], { role }).exec()
                expect(retrievedUser).toBeDefined()
            })
        })
    })

    describe('ListQuery', () => {
        it('should list the records', async () => {
            @Model class Foo extends Document {
    
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }
    
            orm.registerDocument(Foo)
    
            const foo1 = new Foo({ name: "Johnny", age: 42 })
            const foo2 = new Foo({ name: "James", age: 42 })
            orm.insert(Foo, foo1).exec()
            orm.insert(Foo, foo2).exec()

            const results = await orm.list(Foo).exec()
            expect(results.length).toBe(2)
        })
        
        describe('nested documents', () => {
            it('should retrieve the bar documents with the foo documents', async() => {
                @Model class Bar extends Document {
        
                    @Primary id: string
                    @Field name: string
                    @Field address: string
                
                    constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                        super()
                        Object.assign( this, params )
                    }
                }
        
                @Model class Foo extends Document {
        
                    @Primary id: string
                    @Field name: string
                    @Field age: number
                    @Field bar: Bar
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }
        
                orm.registerDocument(Foo)
                orm.registerDocument(Bar)
        
                const bar1 = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                const foo1 = new Foo({ name: "Johnny", age: 42, bar: bar1 })
                await orm.insert(Bar, bar1).exec()
                await orm.insert(Foo, foo1).exec()
    
                const foo2 = new Foo({ name: "James", age: 42, bar: bar1 })
                await orm.insert(Foo, foo2).exec()
    
                const results = await orm.list(Foo).exec()
                expect(results.length).toBe(2)
                expect(results[0].bar).toBeTruthy()
                expect(results[0].bar.id).toBe(bar1.id)
                expect(results[1].bar).toBeTruthy()
                expect(results[1].bar.id).toBe(bar1.id)
            })
    
            it('should retrieve the same bar document for each foo document', async() => {
                @Model class Bar extends Document {
        
                    @Primary id: string
                    @Field name: string
                    @Field address: string
                
                    constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                        super()
                        Object.assign( this, params )
                    }
                }
        
                @Model class Foo extends Document {
        
                    @Primary id: string
                    @Field name: string
                    @Field age: number
                    @Field bar: Bar
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }
        
                orm.registerDocument(Foo)
                orm.registerDocument(Bar)
        
                const bar1 = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                const foo1 = new Foo({ name: "Johnny", age: 42, bar: bar1 })
                await orm.insert(Bar, bar1).exec()
                await orm.insert(Foo, foo1).exec()
    
                const foo2 = new Foo({ name: "James", age: 42, bar: bar1 })
                await orm.insert(Foo, foo2).exec()
    
                const results = await orm.list(Foo).exec()
                expect(results.length).toBe(2)
                expect(results[0].bar).toBe(results[1].bar)
            })

            it('should allow bar to be undefined', async () => {
                @Model class Bar extends Document {
        
                    @Primary id: string
                    @Field name: string
                    @Field address: string
                
                    constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                        super()
                        Object.assign( this, params )
                    }
                }
        
                @Model class Foo extends Document {
        
                    @Primary id: string
                    @Field name: string
                    @Field age: number
                    @Field bar: Bar
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }
        
                orm.registerDocument(Foo)
                orm.registerDocument(Bar)
        
                const foo1 = new Foo({ name: "Johnny", age: 42 })

                await orm.insert(Foo, foo1).exec()
    
                const foo2 = new Foo({ name: "James", age: 42 })
                await orm.insert(Foo, foo2).exec()
    
                const results = await orm.list(Foo).exec()
                expect(results.length).toBe(2)
                expect(results[0].bar).toBe(null)
            })
            it('should allow bar to be null', async () => {
                @Model class Bar extends Document {
        
                    @Primary id: string
                    @Field name: string
                    @Field address: string
                
                    constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                        super()
                        Object.assign( this, params )
                    }
                }
        
                @Model class Foo extends Document {
        
                    @Primary id: string
                    @Field name: string
                    @Field age: number
                    @Field bar: Bar
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }
        
                orm.registerDocument(Foo)
                orm.registerDocument(Bar)
        
                const foo1 = new Foo({ name: "Johnny", bar: null })

                await orm.insert(Foo, foo1).exec()
    
                const foo2 = new Foo({ name: "James", bar: null })
                await orm.insert(Foo, foo2).exec()
    
                const results = await orm.list(Foo).exec()
                expect(results.length).toBe(2)
                expect(results[0].bar).toBe(null)
            })
        })
        describe('Filter operators', () => {
            describe('String', () => {
                describe('equality', () => {
                    it('should filter the records on the name', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
            
                        const results = await orm.list(Foo, { name: foo1.name }).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].name).toBe(foo1.name)
                    })
                    it('should match on a regex', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
            
                        const results = await orm.list(Foo, { name: /j/i }).exec()
                        expect(results.length).toBe(2)
                    })
                })
                describe('not equal', () => {
                    it('should return records not equal to', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
            
                        const results = await orm.list(Foo, { name__ne: foo1.name }).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].name).toBe(foo2.name)
                    }) 
                })
                describe('in', () => {
                    it('should filter the records on multiple names', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Jimmy", age: 42})
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { name__in: [foo1.name, foo2.name] }).exec()
                        expect(results.length).toBe(2)
                    })
                })
                describe('not in', () => {
                    it('should filter the records on multiple names', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Jimmy", age: 42})
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { name__nin: [foo1.name, foo2.name] }).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].name).toEqual(foo3.name)
                    })
                })
                describe('search', () => {
                    it('should perform a case sensitive search', async() => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
    
                        const foo1 = new Foo({ name: "Johnny", age: 42})
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56} )
    
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
                
                        const results = await orm.list(Foo, { name__search: 'J' }).exec()
                        expect(results.length).toBe(2)
                    })
                })
                describe('searchi', () => {
                    it('should perform a case insensitive search', async() => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
    
                        const foo1 = new Foo({ name: "Johnny", age: 42})
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56} )
    
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
                
                        const results = await orm.list(Foo, { name__searchi: 'j' }).exec()
                        expect(results.length).toBe(2)
                    })
                })
                describe('greater/less than', () => {
                    it('should filter strings greater than', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field letter: string
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
    
                        const foo1 = new Foo({ letter: 'A' })
                        const foo2 = new Foo({ letter: 'B' })
                        const foo3 = new Foo({ letter: 'C' })
    
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
                
                        const results = await orm.list(Foo, { letter__gt: 'A' }).exec()
                        expect(results.length).toBe(2)
                    })
                    it('should filter strings greater than or equal to', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field letter: string
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
    
                        const foo1 = new Foo({ letter: 'A' })
                        const foo2 = new Foo({ letter: 'B' })
                        const foo3 = new Foo({ letter: 'C' })
    
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
                
                        const results = await orm.list(Foo, { letter__gte: 'A' }).exec()
                        expect(results.length).toBe(3)
                    })
                    it('should filter strings less than', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field letter: string
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
    
                        const foo1 = new Foo({ letter: 'A' })
                        const foo2 = new Foo({ letter: 'B' })
                        const foo3 = new Foo({ letter: 'C' })
    
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
                
                        const results = await orm.list(Foo, { letter__lt: 'C' }).exec()
                        expect(results.length).toBe(2)
                    })
                    it('should filter strings less than or equal to', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field letter: string
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
    
                        const foo1 = new Foo({ letter: 'A' })
                        const foo2 = new Foo({ letter: 'B' })
                        const foo3 = new Foo({ letter: 'C' })
    
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
                
                        const results = await orm.list(Foo, { letter__lte: 'C' }).exec()
                        expect(results.length).toBe(3)
                    })
                    it('should filter strings between', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field letter: string
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
    
                        const foo1 = new Foo({ letter: 'A' })
                        const foo2 = new Foo({ letter: 'B' })
                        const foo3 = new Foo({ letter: 'C' })
    
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
                
                        const results = await orm.list(Foo, { letter__gt: 'A', letter__lt: 'C' }).exec()
                        expect(results.length).toBe(1)
                    })
                    it('should filter strings between or equal to', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field letter: string
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
    
                        const foo1 = new Foo({ letter: 'A' })
                        const foo2 = new Foo({ letter: 'B' })
                        const foo3 = new Foo({ letter: 'C' })
    
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
                
                        const results = await orm.list(Foo, { letter__gte: 'A', letter__lte: 'C' }).exec()
                        expect(results.length).toBe(3)
                    })
                })
               
            })
            describe('Primary Key', () => {
                describe('equality', () => {
                    it('should filter the records by id', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
            
                        const results = await orm.list(Foo, { id: foo1.id }).exec()
                        expect(results.length).toBe(1)
                    })
                })
                describe('not equal', () => {
                    it('should filter records where id does not equal', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Jimmy", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { id__ne: foo1.id }).exec()
                        expect(results.length).toBe(2)
                    })
                })
                describe('in', () => {
                    it('should filter the records by multiple ids', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Jimmy", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        
            
                        const results = await orm.list(Foo, { id__in: [foo1.id, foo2.id] }).exec()
                        expect(results.length).toBe(2)
                    })
                })
                describe('not in', () => {
                    it('should filter the records by multiple ids', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "James", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { id__nin: [foo1.id, foo2.id] }).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].id).toBe(foo3.id)
                    })
                })
                describe('search',  () => {
                    it('should throw an error', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
            
                        const results = 
                        await expect( async () => {
                            await orm.list(Foo, { id__search: '' }).exec()
                        })
                        .rejects
                        .toThrow('Cannot search on primary key');
                    })
                })
                describe('searchi', () => {
                    it('should throw an error', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
            
                        const results = 
                        await expect( async () => {
                            await orm.list(Foo, { id__searchi: '' }).exec()
                        })
                        .rejects
                        .toThrow('Cannot search on primary key');
                    })
                })
            })
            describe('Number', () => {
                describe('eqality', () => {
                    it('should filter the records on the age', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
            
                        const results = await orm.list(Foo, { age: foo1.age }).exec()
                        expect(results.length).toBe(2)
                    })
                })
                describe('not equal', () => {
                    it('should filter the records on age', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 42 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "James", age: 56 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { age__ne: foo1.age }).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].age).toBe(foo3.age)
                    })
                })
                describe('in', () => {
                    it('should filter the records on multiple ages', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 36 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { age__in: [foo1.age, foo2.age] }).exec()
                        expect(results.length).toBe(2)
                    })
                })
                describe('not in', () => {
                    it('should filter the records on multiple ages', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 36 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { age__nin: [foo1.age, foo2.age] }).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].age).toBe(foo3.age)
                    })
                })
                describe('greater/less than', () => {
                    it('should filter numbers greater than', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 36 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { age__gt: foo1.age }).exec()
                        expect(results.length).toBe(2)
                    })
                    it('should filter numbers greater than or equal to', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 36 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { age__gte: foo1.age }).exec()
                        expect(results.length).toBe(3)
                    })
                    it('should filter numbers less than', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 36 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { age__lt: foo3.age }).exec()
                        expect(results.length).toBe(2)
                    })
                    it('should filter numbers less than or equal to', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 36 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { age__lte: foo3.age }).exec()
                        expect(results.length).toBe(3)
                    })
                    it('should filter numbers between', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 36 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { age__gt: foo1.age, age__lt: foo3.age }).exec()
                        expect(results.length).toBe(1)
                    })
                    it('should filter numbers between or equal to', async () => {
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                
                        const foo1 = new Foo({ name: "Johnny", age: 36 })
                        const foo2 = new Foo({ name: "James", age: 42 })
                        const foo3 = new Foo({ name: "Mary", age: 56 })
                        await orm.insert(Foo, foo1).exec()
                        await orm.insert(Foo, foo2).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, { age__gte: foo1.age, age__lte: foo3.age }).exec()
                        expect(results.length).toBe(3)
                    })
                })
            })
            describe('Document', () => {
                describe('equality', () => {
                    it('should select the foo document by selecting on the bar id', async() => {
                        @Model class Bar extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field address: string
                        
                            constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                            @Field bar: Bar
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                        orm.registerDocument(Bar)
                
                        const bar1 = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                        const foo1 = new Foo({ name: "Johnny", age: 42, bar: bar1 })
                        await orm.insert(Bar, bar1).exec()
                        await orm.insert(Foo, foo1).exec()
            
                        const bar2 = new Bar({ name: "The Five and Dime", address: "123 Main St"})
                        const foo2 = new Foo({ name: "James", age: 42, bar: bar2 })
                        await orm.insert(Bar, bar2).exec()
                        await orm.insert(Foo, foo2).exec()
            
                        const results = await orm.list(Foo, {bar: bar1.id}).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].bar).toBeTruthy()
                        expect(results[0].bar.id).toBe(bar1.id)
                    })
                    it('should select the foo document by selecting on the bar object', async() => {
                        @Model class Bar extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field address: string
                        
                            constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                            @Field bar: Bar
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                        orm.registerDocument(Bar)
                
                        const bar1 = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                        const foo1 = new Foo({ name: "Johnny", age: 42, bar: bar1 })
                        await orm.insert(Bar, bar1).exec()
                        await orm.insert(Foo, foo1).exec()
            
                        const bar2 = new Bar({ name: "The Five and Dime", address: "123 Main St"})
                        const foo2 = new Foo({ name: "James", age: 42, bar: bar2 })
                        await orm.insert(Foo, foo2).exec()
            
                        const results = await orm.list(Foo, {bar: bar1}).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].bar).toBeTruthy()
                        expect(results[0].bar.id).toBe(bar1.id)
                    })
                })
                describe('not equal', () => {
                    it('should select the foo document by selecting on the bar id', async() => {
                        @Model class Bar extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field address: string
                        
                            constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                            @Field bar: Bar
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                        orm.registerDocument(Bar)
                
                        const bar1 = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                        const foo1 = new Foo({ name: "Johnny", age: 42, bar: bar1 })
                        await orm.insert(Bar, bar1).exec()
                        await orm.insert(Foo, foo1).exec()
            
                        const bar2 = new Bar({ name: "The Five and Dime", address: "123 Main St"})
                        const foo2 = new Foo({ name: "James", age: 42, bar: bar2 })
                        await orm.insert(Bar, bar2).exec()
                        await orm.insert(Foo, foo2).exec()
            
                        const results = await orm.list(Foo, {bar__ne: bar1.id}).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].bar).toBeTruthy()
                        expect(results[0].bar.id).toBe(bar2.id)
                    })
                })
                describe('in', () => {
                    it('should select the foo document by selecting on the bar id', async() => {
                        @Model class Bar extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field address: string
                        
                            constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                            @Field bar: Bar
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                        orm.registerDocument(Bar)
                
                        const bar1 = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                        const foo1 = new Foo({ name: "Johnny", age: 42, bar: bar1 })
                        await orm.insert(Bar, bar1).exec()
                        await orm.insert(Foo, foo1).exec()
            
                        const bar2 = new Bar({ name: "The Five and Dime", address: "123 Main St"})
                        const foo2 = new Foo({ name: "James", age: 42, bar: bar2 })
                        await orm.insert(Foo, foo2).exec()
    
                        const bar3 = new Bar({ name: "The Five and Dime", address: "123 Main St"})
                        const foo3 = new Foo({ name: "James", age: 42, bar: bar2 })
                        await orm.insert(Foo, foo2).exec()
            
                        const results = await orm.list(Foo, {bar: bar1.id}).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].bar).toBeTruthy()
                        expect(results[0].bar.id).toBe(bar1.id)
                    })
                })
                describe('in', () => {
                    it('should select the foo document by selecting on the bar id', async() => {
                        @Model class Bar extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field address: string
                        
                            constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                            @Field bar: Bar
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                        orm.registerDocument(Bar)
                
                        const bar1 = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                        const foo1 = new Foo({ name: "Johnny", age: 42, bar: bar1 })
                        await orm.insert(Bar, bar1).exec()
                        await orm.insert(Foo, foo1).exec()
            
                        const bar2 = new Bar({ name: "The Five and Dime", address: "123 Main St"})
                        const foo2 = new Foo({ name: "James", age: 42, bar: bar2 })
                        await orm.insert(Bar, bar2).exec()
                        await orm.insert(Foo, foo2).exec()
    
                        const bar3 = new Bar({ name: "The Five and Dime", address: "123 Main St"})
                        const foo3 = new Foo({ name: "James", age: 42, bar: bar3 })
                        await orm.insert(Bar, bar3).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, {bar__in: [bar1,bar2]}).exec()
                        expect(results.length).toBe(2)
                        expect(results[0].bar).toBeTruthy()
                        expect(results[0].bar.id).toBe(bar1.id)
                        expect(results[1].bar.id).toBe(bar2.id)
                    })
                })
                describe('not in', () => {
                    it('should select the foo document by selecting on the bar id', async() => {
                        @Model class Bar extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field address: string
                        
                            constructor( params?: Partial<Pick<Bar, keyof Bar>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        @Model class Foo extends Document {
                
                            @Primary id: string
                            @Field name: string
                            @Field age: number
                            @Field bar: Bar
                        
                            constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                                super()
                                Object.assign( this, params )
                            }
                        }
                
                        orm.registerDocument(Foo)
                        orm.registerDocument(Bar)
                
                        const bar1 = new Bar({ name: "The Last Drop", address: "16 Fantasy Lane"})
                        const foo1 = new Foo({ name: "Johnny", age: 42, bar: bar1 })
                        await orm.insert(Bar, bar1).exec()
                        await orm.insert(Foo, foo1).exec()
            
                        const bar2 = new Bar({ name: "The Five and Dime", address: "123 Main St"})
                        const foo2 = new Foo({ name: "James", age: 42, bar: bar2 })
                        await orm.insert(Bar, bar2).exec()
                        await orm.insert(Foo, foo2).exec()
    
                        const bar3 = new Bar({ name: "The Five and Dime", address: "123 Main St"})
                        const foo3 = new Foo({ name: "James", age: 42, bar: bar3 })
                        await orm.insert(Bar, bar3).exec()
                        await orm.insert(Foo, foo3).exec()
            
                        const results = await orm.list(Foo, {bar__nin: [bar1,bar2]}).exec()
                        expect(results.length).toBe(1)
                        expect(results[0].bar).toBeTruthy()
                        expect(results[0].bar.id).toBe(bar3.id)
                    })
                })
            })
        })
        describe('Filter by fields not on view', () => {
            it('should specify document/view as an array', async () => {
                @Model class Foo extends Document {
    
                    @Primary id: string
                    @Field name: string
                    @Field age: number
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }


                interface FooName extends Pick<Foo, 'id'|'name'> { }
                @View(Foo, ['id', 'name'])
                class FooName extends Document {

                }

                orm.registerDocument(Foo)

                const foo1 = new Foo({ name: "Johnny", age: 42 })
                const foo2 = new Foo({ name: "James", age: 42 })
                orm.insert(Foo, foo1).exec()
                orm.insert(Foo, foo2).exec()
        
                const foos = await orm.list([Foo,FooName], { age: 42 }).exec()
                expect(foos.length).toBe(2)
            })
            it('should specify document/view as an object', async () => {
                @Model class Foo extends Document {
    
                    @Primary id: string
                    @Field name: string
                    @Field age: number
                
                    constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                        super()
                        Object.assign( this, params )
                    }
                }


                interface FooName extends Pick<Foo, 'id'|'name'> { }
                @View(Foo, ['id', 'name'])
                class FooName extends Document {

                }

                orm.registerDocument(Foo)

                const foo1 = new Foo({ name: "Johnny", age: 42 })
                const foo2 = new Foo({ name: "James", age: 42 })
                orm.insert(Foo, foo1).exec()
                orm.insert(Foo, foo2).exec()
        
                const foos = await orm.list({document: Foo, view: FooName}, { age: 42 }).exec()
                expect(foos.length).toBe(2)
            })
        })
    })

    describe('DeleteQuery', () => {
        it('should delete the foo by id', async() => {
            @Model class Foo extends Document {
    
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }
    
            const foo = new Foo({ name: "Johnny", age: 42 })
            orm.registerDocument(Foo)

            const { id } = await orm.insert(Foo, foo).exec()
            
            const result = await orm.delete(Foo, id).exec()
            expect(result.deletedCount).toBe(1)
        })
        it('should delete the foo by filter', async() => {
            @Model class Foo extends Document {
    
                @Primary id: string
                @Field name: string
                @Field age: number
            
                constructor( params?: Partial<Pick<Foo, keyof Foo>>) {
                    super()
                    Object.assign( this, params )
                }
            }
    
            const foo = new Foo({ name: "Johnny", age: 42 })
            orm.registerDocument(Foo)

            await orm.insert(Foo, foo).exec()
            
            const result = await orm.delete(Foo, { name: "Johnny", age: 42 } ).exec()
            expect(result.deletedCount).toBe(1)
        })
    })

    describe('DeleteManyQuery', () => {
        it('should delete the shifts', async() => {
            @Model class Shift extends Document {
                @Primary id?: string
                @Field timeIn: Date
                @Field timeOut?: Date
            
                constructor( params?: Partial<Pick<Shift, keyof Shift>>) {
                    super()
                    Object.assign( this, params )
                }
            }


            orm.registerDocument(Shift)
    
            const shift1 = new Shift({ timeIn: new Date('2012-01-01 17:00:00'), timeOut: new Date('2012-01-01 21:00:00') })
            const shift2 = new Shift({ timeIn: new Date('2012-01-01 17:30:00'), timeOut: new Date('2012-01-01 21:00:00') })
            const shift3 = new Shift({ timeIn: new Date('2012-01-01 18:00:00'), timeOut: new Date('2012-01-01 21:00:00') })

            await orm.insert(Shift, shift1).exec()
            await orm.insert(Shift, shift2).exec()
            await orm.insert(Shift, shift3).exec()

            await orm.deleteMany(Shift, { timeOut: new Date('2012-01-01 21:00:00') }).exec()

            const shifts = await orm.list(Shift).exec()
            expect(shifts.length).toBe(0)

        })
    })

    describe('ForeignKey fields', () => {
        describe('Insert Query', () => {

            it('should retrieve the bar object', async () => {
                @Model class Bar extends Document{
                    @Primary id: string
                    @Field name: string
                }
                
                @Model class Foo extends Document {
                    @Primary id: string
                    @Field bar: Bar;
                }
    
                interface FooCreateView extends Omit<Foo, 'bar'> { }
    
                @View(Foo, {
                    omit: ['bar']
                }) class FooCreateView extends Document {
                    @ForeignKey bar: string
                }

                orm.registerDocument(Foo)
                orm.registerDocument(Bar)
    
                const bar = new Bar();
                bar.name = 'Baz'
                await orm.insert(Bar, bar).exec()
    
                const foo = new FooCreateView();
                foo.bar = bar.id
                await orm.insert(FooCreateView, foo).exec()
    
                const retrievedFoo = await orm.retrieve(Foo, foo.id).exec()
                expect(retrievedFoo.bar.name).toEqual(bar.name)
            })
            
        })
        describe('Retrieve Query', () => {
            it('should retrieve the bar id', async () => {
                @Model class Bar extends Document{
                    @Primary id: string
                    @Field name: string
                }
                
                @Model class Foo extends Document {
                    @Primary id: string
                    @Field bar: Bar;
                }
    
                interface FooCreateView extends Omit<Foo, 'bar'> { }
    
                @View(Foo, {
                    omit: ['bar']
                }) class FooCreateView extends Document {
                    @ForeignKey bar: string
                }


                orm.registerDocument(Foo)
                orm.registerDocument(Bar)
    
                const bar = new Bar();
                bar.name = 'Baz'
                await orm.insert(Bar, bar).exec()
    
                const foo = new FooCreateView();
                foo.bar = bar.id
                await orm.insert(FooCreateView, foo).exec()
    
                const retrievedFoo = await orm.retrieve(FooCreateView, foo.id).exec()
                expect(retrievedFoo.bar).toBe(bar.id)
            })
        })
        // describe('Update Query', () => {

        // })

        describe('Lookup Query', () => {
            it('should retrieve the bar id', async () => {
                @Model class Bar extends Document{
                    @Primary id: string
                    @Field name: string
                }
                
                @Model class Foo extends Document {
                    @Primary id: string
                    @Field bar: Bar;
                }
    
                interface FooCreateView extends Omit<Foo, 'bar'> { }
    
                @View(Foo, {
                    omit: ['bar']
                }) class FooCreateView extends Document {
                    @ForeignKey bar: string
                }


                orm.registerDocument(Foo)
                orm.registerDocument(Bar)
    
                const bar = new Bar();
                bar.name = 'Baz'
                await orm.insert(Bar, bar).exec()
    
                const foo = new FooCreateView();
                foo.bar = bar.id
                await orm.insert(FooCreateView, foo).exec()
    
                const retrievedFoo = await orm.retrieve(FooCreateView, { bar: bar.id } ).exec()
                expect(retrievedFoo.bar).toBe(bar.id)
            })
        })

        describe('List Query', () => {
            it('should retrieve the bar id', async () => {
                @Model class Bar extends Document{
                    @Primary id: string
                    @Field name: string
                }
                
                @Model class Foo extends Document {
                    @Primary id: string
                    @Field bar: Bar;
                }
    
                interface FooCreateView extends Omit<Foo, 'bar'> { }
    
                @View(Foo, {
                    omit: ['bar']
                }) class FooCreateView extends Document {
                    @ForeignKey bar: string
                }


                orm.registerDocument(Foo)
                orm.registerDocument(Bar)
    
                const bar = new Bar();
                bar.name = 'Baz'
                await orm.insert(Bar, bar).exec()
    
                const foo1 = new FooCreateView();
                foo1.bar = bar.id
                await orm.insert(FooCreateView, foo1).exec()

                const foo2 = new FooCreateView();
                foo2.bar = bar.id
                await orm.insert(FooCreateView, foo2).exec()
    
                const retrievedFoos = await orm.list(FooCreateView, { bar: bar.id } ).exec()
                expect(retrievedFoos[0].bar).toBe(bar.id)
                expect(retrievedFoos[1].bar).toBe(bar.id)
            })
        })
    })
    
})

    

