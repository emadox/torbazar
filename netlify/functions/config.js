/**
 * Netlify Function: Servir configuración de Supabase
 * Accesible en: /.netlify/functions/config
 */

exports.handler = async (event, context) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Supabase variables not configured in Netlify environment'
            })
        };
    }

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            supabaseUrl: supabaseUrl,
            supabaseKey: supabaseKey
        })
    };
};
