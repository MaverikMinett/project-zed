import { Document, Model, ModelDescriptor } from "@agape/model";
import { Class } from '@agape/types';
import { FilterCriteria } from "./types";
import { ObjectId } from "mongodb";

import { classExtends } from '@agape/object'

export function selectCriteriaFromFilterCriteria<T>( descriptor: ModelDescriptor, filterCriteria: FilterCriteria<T> ) {
    let select = {}
    const criterias = []


    // create select criteria from filter
    if ( filterCriteria ) {
        for ( let filterField of Object.keys(filterCriteria) ) {

            let filterFieldName: string
            let operator: string
            let selectFieldName: string
            let selectFieldValue: any
            if ( ! filterField.match(/__/) ) {
                filterFieldName = filterField
                operator = 'eq'
            }
            else {
                [ filterFieldName, operator ] = filterField.split('__')
            }

            if ( descriptor.fields.get(filterFieldName).primary ) {
                selectFieldName = '_id'
            }
            else {
                selectFieldName = filterFieldName
            }

            const criteria = {
                [selectFieldName]: { }
            }

            if  ( operator === 'eq' || operator === 'ne' ) {
                if ( descriptor.fields.get(filterFieldName).primary ) {
                    selectFieldValue = new ObjectId(filterCriteria[filterField])
                }
                else if ( classExtends(descriptor.fields.get(filterFieldName).designType as Class, Document) ) {
                    if ( typeof filterCriteria[filterField][0] === 'string' ) {
                        selectFieldValue = new ObjectId(filterCriteria[filterField])
                    }
                    else {
                        const foreignModelDescriptor = Model.descriptor(descriptor.fields.get(filterFieldName).designType as Class)
                        const primaryField = foreignModelDescriptor.primaryField
                        selectFieldValue = new ObjectId( primaryField.getValue(filterCriteria[filterField]) )
                    }
                }
                else if ( descriptor.fields.get(filterFieldName).foreignKey ) {
                    if ( filterCriteria[filterField] !== undefined && filterCriteria[filterField] !== null ) {
                        selectFieldValue = new ObjectId(filterCriteria[filterField])
                    }
                    else {
                        selectFieldValue = filterCriteria[filterField]
                    }
                }
                else {
                    selectFieldValue = filterCriteria[filterField]
                }
                
                if ( operator === 'eq' && selectFieldValue instanceof RegExp ) {
                    operator = 'regex'
                }
                
                criteria[selectFieldName] = {
                    [`$${operator}`]: selectFieldValue
                }
            }
            else if ( operator === 'in' ) {
                if ( descriptor.fields.get(filterFieldName).primary ) {
                    selectFieldValue = filterCriteria[filterField].map( value => new ObjectId(value) )
                }
                else if ( classExtends(descriptor.fields.get(filterFieldName).designType as Class, Document) ) {
                    if ( typeof filterCriteria[filterField][0] === 'string' ) {
                        selectFieldValue = filterCriteria[filterField].map( value => new ObjectId(value) )
                    }
                    else {
                        const foreignModelDescriptor = Model.descriptor(descriptor.fields.get(filterFieldName).designType as Class)
                        const primaryField = foreignModelDescriptor.primaryField
                        selectFieldValue = filterCriteria[filterField].map( value => new ObjectId( primaryField.getValue(value) ) )
                    }
                }
                else {
                    selectFieldValue = filterCriteria[filterField]
                }
                criteria[selectFieldName]['$in'] = selectFieldValue
            }
            else if ( operator === 'search' ) {
                if ( descriptor.fields.get(filterFieldName).primary ) {
                    throw new Error('Cannot search on primary key')
                }
                selectFieldValue = new RegExp(filterCriteria[filterField]) 
                criteria[selectFieldName]['$regex'] = selectFieldValue
            }
            else if ( operator === 'searchi' ) {
                if ( descriptor.fields.get(filterFieldName).primary ) {
                    throw new Error('Cannot search on primary key')
                }
                selectFieldValue = new RegExp(filterCriteria[filterField], 'i') 
                criteria[selectFieldName]['$regex'] = selectFieldValue
            }
            else if ( operator === 'gt' || operator === 'gte' || operator === 'lt' || operator === 'lte' ) {
                selectFieldValue = filterCriteria[filterField]
                const selectOperator = `$${operator}`
                criteria[selectFieldName][selectOperator] = selectFieldValue
            }
            else {
                throw new Error(`Invalid operator "${operator}" in filter field "${filterField}"`)
            }
            criterias.push( criteria )

            

        }

        if ( criterias.length === 1 ) {
            select = criterias[0]
        }
        else if ( criterias.length > 1 ) {
            select['$and'] = criterias
        }
    }

    return select
}

export function itemToRecord( model: Class, item: any ) {
    const descriptor = Model.descriptor(model)
    const fields = descriptor.fields.all().filter( f => ! f.primary )

    const record: any = { }
    for ( let field of fields ) {
        if ( field.designType instanceof Function && field.designType.prototype as any instanceof Document ) {
            const designTypeModelDescriptor = Model.descriptor(field.designType)
            const fieldValue = descriptor.fields.get( field.name ).getValue(item)
            if ( fieldValue !== undefined && fieldValue !== null ) {
                const idString = designTypeModelDescriptor.primaryField.getValue( fieldValue )

                const objectId = new ObjectId(idString)
                record[field.name] = objectId
            }
            else {
                record[field.name] = item[field.name]
            }
            
        }
        else if ( field.foreignKey === true ) {
            if ( item[field.name] !== undefined && item[field.name] !== null ) {
                record[field.name] = new ObjectId(item[field.name])
            }
            else {
                record[field.name] = item[field.name]
            }
        }
        else {
            record[field.name] = item[field.name]
        }
    }

    return record
}

export function documentAndViewFromModelParam<T extends Class<Document>, P extends Class<Document>=T>(model: T|[P,T]|{document: P, view: T}): { document: P, view: T} {
    let document: P
    let view: T

    if ( Array.isArray(model) ) {
        document = model[0]
        view = model[1]
    }
    else if ( typeof model === 'function' ) {
        document = model as unknown as P
        view = model
    }
    else {
        document = model.document
        view = model.view
    }

    return { document, view }
}