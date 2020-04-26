import { IPsi } from "../helpers/Psi";
import { Type } from "../structures/Type";
import { IApiCtx } from "../contexts/ApiCtx";
import VarRes from "./VarRes";
import FuncCallRes from "./FuncCallRes";
import ArrCtorRes from "./ArrCtorRes";

const DirectTypeResolver = ({exprPsi, apiCtx}: {
    exprPsi: IPsi, apiCtx: IApiCtx,
}): Type[] => {
    const main = () => {
        const result = [
            ...ArrCtorRes({exprPsi, apiCtx}),
            ...FuncCallRes({exprPsi, apiCtx}),
            ...VarRes({exprPsi, apiCtx}),
        ];
        if (!result.length) {
            //Log.info({'ololo no results for': exprPsi + ''});
        }
        return result;
    };

    return main();
};

export default DirectTypeResolver;