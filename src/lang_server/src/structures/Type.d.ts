
interface IType {
    kind: string,
}

interface IStr {
    kind: 'IStr',
    content: string,
}

interface IRecordArr extends IType {
    kind: 'IRecordArr',
    entries: Array<{
        keyType: Type,
        valueType: Type,
    }>,
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

export type Type = IRecordArr | IMapArr | IListArr | ITupleArr | IStr | IMt | IAny;