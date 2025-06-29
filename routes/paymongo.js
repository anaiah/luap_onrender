const express = require('express')
const app = express()
const router = express.Router()

const fs = require('fs');

const Utils = require('./util')//== my func

const cors = require('cors')
const path = require('path')
const querystring = require("querystring")

const { connectPg, closePg, closeDb, connectDb}  = require('../db')


const cookieParser = require('cookie-parser')
app.use( cookieParser() )

//use express.json() middleware to parse JSON request body
app.use(express.json())

connectDb()
.then((db)=>{
    console.log("====paymongo.js API.JS ASIANOW  J&T GROUP MYSQL SUCCESS!====")
    closeDb(db);
})                        
.catch((error)=>{
    console.log("*** paymongo.js  GROUP ERROR, CAN'T CONNECT TO MYSQL DB!****",error.code)
});

module.exports = (io) => {
    //=================================START HERE ============================
    const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_API_LUAP_TEST; // Store your secret key in environment variables

    router.post('/pay', async(req,res)=>{

        const { amount , description } = req.body; // amount in centavos
        try {
            const response = await fetch('https://api.paymongo.com/v1/links', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64'),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            amount: parseFloat(amount), // in centavos
                            description: description // you can customize
                        }
                    }
                })
            }); //end fetch

            if (!response.ok) {
                // Parse error response if needed
                const errorData = await response.json();
                return res.status(response.status).json(errorData);
            }

            const data = await response.json();
            res.json(data);

        } catch (error) {
            console.error('Error calling PayMongo API:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    })


    //WEBHOOK REGISTER
    router.post('/webhook', (req, res) =>{
        res.sendStatus(200)
        
        const event = req.body

        if(event.type === 'payment.paid'){
            console.log("===PAYMENT SUCCESSFUL!", event.data)
        }

        if(event.type === 'payment.failed'){
            console.log("===PAYMENT FAILED!", event.data)
            return res.sendStatus(400)
        }

        
    })


    //===== REGISTER ONCE ONLY////////
    router.post('/payref', async( req,res)=>{

        const { refno } = req.body;

        //console.log('==CONTACTING gcashref()====', req.params.ref)
        fetch(`https://api.paymongo.com/v1/links?reference_number=${refno}`, {
            method: 'GET',
            headers: {
                    'Authorization': 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64'),
                    'Content-Type': 'application/json'
            }
        })    
        .then(resp => resp.json())
        .then(( json) => {
            console.log('===gcashref()', refno)
            
            if(req.params.ref==""){
                res.json({xdata:{status:'unpaid'}})
            }else{
                res.json({ xdata : json.data[0].attributes} )
            }
            
        })
        

    })

} //ENDMODULE EXPORTS WITH SOCKET.IO

