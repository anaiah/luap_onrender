const express = require('express')
const app = express()
const router = express.Router()

const fs = require('fs');

const Utils = require('./util')//== my func

const cors = require('cors')
const path = require('path')
const querystring = require("querystring")

const { closeDb, connectDb}  = require('../db')


const cookieParser = require('cookie-parser')
app.use( cookieParser() )

//use express.json() middleware to parse JSON request body
app.use(express.json())

connectDb()
.then((db)=>{
    console.log("==== savedb.js MYSQL SUCCESS!====")
    closeDb(db);
})                        
.catch((error)=>{
    console.log("*** savedb.js ERROR, CAN'T CONNECT TO MYSQL DB!****",error.code)
});

module.exports = (io) => {

    const nuDate = () =>{

        //*** USE THIS FOR LOCALHOST NODEJS */

        // const now = new Date()
        // const nuDate = now.toISOString().slice(0,10)
        
        // const localtime = nuDateMysql(now)

        // return[ nuDate, localtime]

        /* === WE USE THIS FOR RENDER.COM VERSION
        */
        const offset = 8
        const malidate = new Date()
        const tamadate = new Date(malidate.getTime()+offset * 60 * 60 * 1000)
        const nuDate = tamadate.toISOString().slice(0,10)
        
        //const datetimestr = nuDateMysql(tamadate)

        return [nuDate, tamadate]
	
    }

    //============save LOGIN FIRST====
    router.post('/savemember', async (req, res) => {
        //console.log('saving to login....', req.body)
        console.log('=========SAVING TO membership db()============')

        const sql = `INSERT into luap_membership (member_id, member_name, email, member_address,member_phone, member_company,
                        dob ) VALUES(?,?,?,?,?,?,?)`
        
        connectDb()
        .then((db)=>{

            try{

                const {member_id,fullname,email,address,phone,company,dob} = req.body
                console.log(sql)
                db.query( sql ,
                    [  
                        member_id,
                        fullname,
                        email,
                        address,
                        phone,
                        company,
                        dob
                    ],(err,result) => {
                
                    if(err){
                        console.error('Error Login',err)
                        if(err.code === 'ER_DUP_ENTRY'){
                            return res.status(200).json({success:'fail',msg:'YOU ALREADY ENROLLED!!!'})
                        //return res.status(500).json({error:"error!"})
                        }else{
                            return res.status(200).json({success:'fail',msg:'DATABASE ERROR, PLEASE TRY AGAIN!!!'})
                        }
                    }else{
                        if(result){
                        
                            //return res.status(200).json()
                            return res.status(200).json( {success:'ok' ,data:result}) 
                            
                        }else{
                            return res.status(400).json({error:'failed'})
                        }//eif
                        
                    }//eif
                })
                
            }catch (error){
                console.error('Error Login',err)
                res.status(500).json({error:"error!"})

            }finally{
                closeDb(db)
            
            }//end try
        
        }).catch((error)=>{
            res.status(500).json({error:'Error'})
        })
        
    })
    return router;

} //ENDMODULE EXPORTS WITH SOCKET.IO


//============save LOGIN FIRST====
router.post('/savetologin/:empid', async (req, res) => {
	//console.log('saving to login....', req.body)
	console.log('=========SAVING TO LOGIN()============',req.params.empid)

	const sql = 'INSERT into asn_transaction (emp_id,parcel,transaction_number,created_at,login_time) VALUES(?,?,?,?,?)'
	
	const [datestr, datetimestr] = nuDate()

	console.log(datetimestr)
	
	connectDb()
    .then((db)=>{

		try{

			db.query( sql ,
				[ 
					parseInt(req.params.empid), 
					parseInt(req.body.f_parcel), 
					req.body.transnumber, 
					datestr,
					datetimestr
				],(err,result) => {
			
				if(err){
					//console.error('Error Login',err)
					if(err.code === 'ER_DUP_ENTRY'){
						return res.status(200).json({success:'fail',msg:'YOU ALREADY HAVE A DATA SAVED FOR TODAY!!!'})
					//return res.status(500).json({error:"error!"})
					}else{
						return res.status(200).json({success:'fail',msg:'DATABASE ERROR, PLEASE TRY AGAIN!!!'})
					}
				}else{
					if(result){
					
						//return res.status(200).json()
						const retdata = {success:'ok'} 
						//get chart data
						getChartData(req, res, retdata )

						console.log("SAVING LOGIN gettingchart data")
						
					}else{
						return res.status(400).json({error:'failed'})
					}//eif
					
				}//eif
			})
			

		}catch (error){
			console.error('Error Login',err)
			res.status(500).json({error:"error!"})

		}finally{
			closeDb(db)
		
		}//end try
	
	}).catch((error)=>{
        res.status(500).json({error:'Error'})
    })
	
})