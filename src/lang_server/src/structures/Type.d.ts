
interface IType {
    kind: string,
}

interface IStr {
    kind: 'IStr',
    content: string,
}

export interface IRecordEntry {
    keyType: Type,
    valueType: Type,
}

export interface IRecordArr extends IType {
    kind: 'IRecordArr',
    entries: IRecordEntry[],
}

interface IMapArr extends IType {
    kind: 'IMapArr',
    keyType: Type,
    valueType: Type,
}

interface IListArr extends IType {
    kind: 'IListArr',
    valueType: Type,
}

interface ITupleArr extends IType {
    kind: 'ITupleArr',
    elements: Type[],
}

/** MultiType */
interface IMt extends IType {
    kind: 'IMt',
    types: Type[],
}

interface IAny extends IType {
    kind: 'IAny',
}

interface IFqn extends IType {
    kind: 'IFqn',
    fqn: string,
    generics: Type[],
}

export type Type = IRecordArr | IMapArr | IListArr | ITupleArr | IFqn | IStr | IMt | IAny;