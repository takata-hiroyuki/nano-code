const callOpenAI = async() => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: [
                {role: 'user', content: 'TypeScriptについて簡潔に説明して下さい。'}
            ],
        }),
    });

    try {
        const data:any = await response.json();
        //console.log(data);
        console.log(data.choices[0].message.content);
    }catch (e){
        console.log("失敗しました");
        console.error(e);
    }


}

callOpenAI();