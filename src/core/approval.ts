import * as readline from 'readline';

export async function requestApproval(
    toolName: string,
    args: any,
): Promise<boolean> {



    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log(`ーーー承認が必要ですーーー`);
        console.log(`ツール： ${toolName}`);
        console.log(`引数；${JSON.stringify(args, null, 2)}`);

        rl.question('このツールを実行しますか？（y/n）:', (answer) => {
            rl.close();

            if (answer.toLocaleLowerCase() === 'y'){
                console.log('承認されました。実行します...');
                resolve(true);
            } else {
                console.log('キャンセルされました。');
                resolve(false);
            }
        });
    });
}