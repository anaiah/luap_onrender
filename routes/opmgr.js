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

connectPg() 
.then((pg)=>{
    console.log("====coor.js ASIANOW  J&T GROUP POSTGRESQL CONNECTION SUCCESS!====")
    closePg(pg);
})                        
.catch((error)=>{
    console.log("*** coor.js J&T GROUP ERROR, API.JS CAN'T CONNECT TO POSTGRESQL DB!****",error.code)
}); 

connectDb()
.then((db)=>{
    console.log("====coor.js API.JS ASIANOW  J&T GROUP MYSQL SUCCESS!====")
    closeDb(db);
})                        
.catch((error)=>{
    console.log("*** coor.js J&T GROUP ERROR, CAN'T CONNECT TO MYSQL DB!****",error.code)
});  
//=================================START HERE ============================

const getmos = () => {
    var series = new Date() 
    var dd = String( series.getDate()).padStart(2, '0')
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	const series1 = yyyy+'-'+mm 
    const series2 = yyyy+'-'+mm+'-'+dd

    return [series1, series2]
}


//==========SUMMARY OF COORDS
router.get('/summary/:email', async(req,res)=>{
    connectDb()
    .then((db)=>{ 

        const [ xmos, ymos ] = getmos()

        console.log('firing summary()====')
                sql2 =`SELECT 
                a.region,
                a.area,
                COALESCE(round(SUM(b.parcel)), 0) AS parcel,
                COALESCE(round(SUM(b.actual_parcel)), 0) AS parcel_delivered,
                COALESCE(round(SUM(b.amount),2), 0) AS amount,
                COALESCE(round(SUM(b.actual_amount),2), 0) AS amount_remitted,
                COALESCE(round( SUM(b.actual_parcel) / SUM(b.parcel)*100,0),0) as qty_pct
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${xmos}%' 
                GROUP BY a.region,a.area
                ORDER by parcel_delivered DESC, a.region;`
    
        //console.log(sql)
        //console.log(sql2,)

        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            
            //console.log(  results) 
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 
})


//===============syummary riders
router.get('/ridersummary/:hub', async(req,res)=>{
    connectDb()
    .then((db)=>{ 
        console.log('firing rider-summary()====')
        
        const [xmos,ymos] = getmos()

        sql2 =`select a.xname as full_name,
                a.id as emp_id, 
                a.hub,
                COALESCE(sum(b.parcel),0) as qty,
                COALESCE(sum(b.actual_parcel),0) as actual_qty,
                COALESCE(round(sum(b.amount),2),0) as amt,
                COALESCE(round(sum(b.actual_amount),2),0) as actual_amt,
                COALESCE(round((sum(b.actual_parcel)/sum(b.parcel))*100),0) as delivered_pct,
                COALESCE(round(100-(sum(b.actual_parcel)/sum(b.parcel))*100),0) as undelivered_pct
                from asn_users a
                left join asn_transaction b 
                on b.emp_id = a.id
                and b.created_at like '${xmos}%' 
                where a.grp_id=1 and a.active= 1 and upper(a.hub) = '${req.params.hub}'
                group by a.id
                order by actual_qty DESC, full_name;`
            
        //console.log(sql)
        //console.log(sql2,)

        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            
            //console.log(  results) 
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 

})

router.get('/opmgrlocation/:area', async( req, res) =>{
     connectDb()
    .then((db)=>{ 

        const [xmos,ymos] = getmos()

        console.log('mtd location()====')

        sql2 =`SELECT 
                a.location,
                a.hub,
                COALESCE(round(SUM(b.parcel)), 0) AS parcel,
                COALESCE(round(SUM(b.actual_parcel)), 0) AS parcel_delivered,
                COALESCE(round(SUM(b.amount),2), 0) AS amount,
                COALESCE(round(SUM(b.actual_amount),2), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${xmos}%' 
                WHERE a.area = '${req.params.area}'
                GROUP BY a.location,a.hub
                ORDER by a.location,parcel_delivered DESC;`

        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            //console.log(results)
            
            //console.log(  results) 
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 
})


router.get('/mtdlocation/:email', async( req, res) =>{
     connectDb()
    .then((db)=>{ 

        const [xmos,ymos] = getmos()

        console.log('mtd location()====')

        sql2 =`SELECT 
                a.location,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${xmos}%' 
                WHERE a.head_email = '${req.params.email}'
                GROUP BY a.location
                ORDER by parcel_delivered DESC;`

        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            //console.log(results)
            
            //console.log(  results) 
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 

})

router.get('/topfivehub/:email/:trans', async(req,res)=>{
    connectDb()
    .then((db)=>{ 

        const [xmos,ymos] = getmos()

        if(req.params.trans=="hub"){
            console.log('top 5 hub()====')
            sql2 =`SELECT 
                a.hub AS hub,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${xmos}%' 
                WHERE a.head_email = '${req.params.email}'
                GROUP BY a.hub
                ORDER by parcel_delivered DESC, a.hub
                LIMIT 5;`
        }else{
            console.log('top 5 riderschart()====')
            sql2 =`SELECT 
                c.xname AS xname,
                COALESCE(SUM(b.parcel), 0) AS parcel,
                COALESCE(SUM(b.actual_parcel), 0) AS parcel_delivered,
                COALESCE(SUM(b.amount), 0) AS amount,
                COALESCE(SUM(b.actual_amount), 0) AS amount_remitted
                FROM asn_hub a
                LEFT JOIN asn_users c ON c.hub = a.hub
                LEFT JOIN asn_transaction b ON b.emp_id = c.id
                and b.created_at like '${xmos}%' 
                WHERE a.head_email = '${req.params.email}'
                AND c.xname IS NOT NULL 
                GROUP BY c.xname
                ORDER by parcel_delivered DESC
                LIMIT 5;`
            
            
        }//eif
            
        //console.log(sql)
        //console.log(sql2,) 

        db.query( sql2 , null , (error, results)=>{
            
            closeDb( db )
            //console.log(results)
            
            //console.log(  results) 
            res.status(200).send(results )

        })

    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 
})

router.get('/getperhour', async(req,res)=>{
    
    const [xmos,ymos] = getmos()
    connectDb()
    .then((db)=>{


        sql = `SELECT 
            DATE_FORMAT(login_time,'%H:00 %p') as hr_start,
            (SUM(sum(parcel)) OVER (ORDER BY HOUR(login_time))) AS parcel_taken,
            round(SUM(sum(actual_parcel)) OVER (ORDER BY HOUR(login_time)),0) AS hourly_delivered,
            round(SUM(sum(actual_amount)) OVER (ORDER BY HOUR(login_time)),2) AS hourly_remit
            FROM asn_transaction
            WHERE created_at='${ymos}'
            GROUP BY HOUR(login_time);`

        console.log('firing getperhour()==')
        db.query( sql , null , (error, results)=>{
            
            closeDb( db )
            //console.log(results)
            
            //console.log(  results) 
            res.status(200).send(results )

        })    
    }).catch((error)=>{
        res.status(500).json({error:'x'})
    }) 

})


module.exports = router;
