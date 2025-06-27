/*

AUTHOR : CARLO DOMINGUEZ

multiple comment //// => IMPORTANT
*/
const express = require('express')

const Utils = require('./util')//== my func
//const QRPDF = require('./qrpdf')
const asnpdf = require('./asnpdf')//=== my own module

const cookieParser = require('cookie-parser')

const cors = require('cors')

const path = require('path')


const formdata = require('form-data')

// const jsftp = require("jsftp");

const fetcher = require('node-fetch')

const IP = require('ip')

const iprequest = require('request-ip')

const querystring = require("querystring")

const nodemailer = require("nodemailer")

const router = express.Router()

const fs = require('fs');

const PuppeteerHTMLPDF = require('puppeteer-html-pdf');

const pdf = require('html-pdf');//used for pdf.create

const hbar = require('handlebars'); //html template
const QRCode = require('qrcode')  // qrcode maker
const sharp = require('sharp')   // for image manipulate

const ftpclient = require('scp2')

const app = express()

app.use( cookieParser() )
const { connectPg, closePg, closeDb, connectDb}  = require('../db')

connectPg() 
.then((pg)=>{
    console.log("====api.js ASIANOW  J&T GROUP POSTGRESQL CONNECTION SUCCESS!====")
    closePg(pg);
})                        
.catch((error)=>{
    console.log("*** J&T GROUP ERROR, API.JS CAN'T CONNECT TO POSTGRESQL DB!****",error.code)
}); 


connectDb()
.then((db)=>{
		try{
			console.log("====API.JS ASIANOW  J&T GROUP M YSQL SUCCESS! DATE ADJUST====")
			
		}catch (error){
			// This catch block will handle errors that occur *before* the db.query callback is executed.
			// For example, if db.query itself throws an error.
			console.error("Error during query execution:", error);
    		//return res.status(500).json({ error: 'Unexpected server error' });
		}finally{
			closeDb(db)
		}    
    //closeDb(db);
})                        
.catch((error)=>{
    console.log("*** J&T GROUP ERROR, CAN'T CONNECT TO MYSQL DB!****",error.code)
});  
//=====CLAIMS UPLOAD
const xlsx = require('xlsx');

const mysqls = require('mysql2/promise')


module.exports = (io) => {
const dbconfig  ={
	host: 'srv1759.hstgr.io',
	user: 'u899193124_asianowjt',
	password: 'M312c4@g125c3',
	database: 'u899193124_asianowjt'
}

// Upload endpoint
router.post('/xlsclaims', upload.single('claims_upload_file'), async (req, res) => {
	
	console.log('==FIRING XLS CLAIMS===')
    try {
        // Read the file buffer
        const workbook = xlsx.read(req.file.buffer);
        
        // Assuming the data is in the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert the sheet to JSON
        const data = xlsx.utils.sheet_to_json(worksheet);
		
		//console.log('json value ', data)
		const insertPromises =[]
 
		
		const conn = await mysqls.createConnection(dbconfig);

			for( const record of data){
				//onst { batch_id,emp_id,full_name, track_number, claims_reason, hubs_location, amt } = record;
				const { batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, batch_file, amt } = record ;
				const query = `INSERT INTO asn_claims (batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, batch_file, amount) 
							VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
				
				insertPromises.push( await conn.execute( query , [batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, batch_file, amt]))
				console.log(query,batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, batch_file, amt)
			}
			await Promise.all(insertPromises)
			await conn.end()
		
			console.log('CLOSING STREAM.. EXCEL FILE UPLOADED SUCCESSFULLY!')
			return res.status(200).json({message:'Claims Excel File Upload Successfully!',status:true})

		
		
    } catch (error) {  //end try
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
		
});


//========login post
router.get('/loginpost/:uid/:pwd',async(req,res)=>{
    console.log('firing login with Authenticate====== ',req.params.uid,req.params.pwd,' ========')
    
	connectDb()
	.then((db)=>{

		let sql =`CALL authenticate_user(?,?)` 
        
		
        db.query( sql, [ req.params.uid , req.params.pwd], (err,data) => { 
			//console.log(err,data[0])
			if( err || data[0].length == 0){
				
				console.log('Error in storedproc Login:',err)
			    
				closeDb(db)
				const xdata=[{
					message: "No Matching Record!",
					voice:"No Matching Record!",
					found:false
				}]
				return res.status(200).json(xdata)  

			}//eif

			const user = data[0][0]

			//console.log('logindata', user)

			if(user){
				
				//get ip address
				const ipaddress = IP.address()
				let aData = []
				let obj =
				{
					email	: 	user.email,
					fname   :   user.full_name.toUpperCase(),
					message	: 	`Welcome to A.S.N. onRoute App!, ${user.full_name.toUpperCase()}!!! `,
					voice	: 	`${user.full_name}!!`,		
					grp_id	:	user.grp_id,
					pic 	: 	user.pic,
					ip_addy :   ipaddress,
					id      :   user.id,
					region  :   user.region,
					position:   user.position,
					found:true
				}
				aData.push(obj)

				return res.status(200).json(aData)
			    
				closeDb(db);//CLOSE connection
                //console.log("===MYSQL CONNECTON CLOSED SUCCESSFULLY===")
                
            }//EIF
           
	   })//END QUERY 
       
    }).catch((error)=>{
        res.status(500).json({error:'No Fetch Docs'})
    }) 
})//== end loginpost

//=== end html routes

//==== GET initial chart data
router.get('/initialchart', async(req,res)=>{
	//return res.status(200).json()
	const retdata = {success:'ok'}
	//get chart data
	getChartData(req, res, retdata )

})

//=== date funcs====
const nuDateMysql=(date)=>{
	const pad=(n)=> n < 10 ? '0' + n : n;
	
	return date.getFullYear()+'-'+
	pad(date.getMonth()+1)+'-'+
	pad(date.getDate())+'-'+
	pad(date.getHours())+':'+
	pad(date.getMinutes())+':'+
	pad(date.getSeconds());
}

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
//===========END LOGIN SAVE====

//=============ADD RIDER TRANSACTION J&T GRP====//
router.post('/savetransaction/:empid', async (req, res) => {
	//console.log('==SAVE TRANSACTION INFO',req.body)
	console.log('=========SAVE TRANSACTION INFO========',req.params.empid,', ',req.body.ff_transnumber)
	
	const [datestr, datetimestr] = nuDate()

	const sql = ` UPDATE asn_transaction 
			SET 
			parcel=?,
			actual_parcel =?, 
			amount = ?, 
			actual_amount = ?, 
			remarks = ? ,
			logout_time = ?
			WHERE emp_id = ?
			and transaction_number = ? `
	//console.log(sql, xdate[0],xdate[1])
	connectDb()
    .then((db)=>{  
		
		try{
			db.query( sql,

				[	
					parseInt(req.body.x_parcel),
					parseInt(req.body.ff_parcel),
					parseFloat(req.body.f_amount), 
					parseFloat(req.body.ff_amount), 
					req.body.ff_remarks,
					datetimestr,
					parseInt(req.params.empid),
					req.body.ff_transnumber
				],
				(err,result)=>{
			
				if (err) {
					console.error("UPDATE INSERT error", err);
					//results[0]
					return res.json({						
						status:false
					})
				}
				if(result){

					//return res.status(200).json()
					const retdata = {
						message: "Transaction added Successfully!",
						voice:"Transaction Added Successfully!",
						status:true
					}

					//get chart data
					getChartData(req, res, retdata )
				
				}//eif
					
			});//END DB QUERY

		}catch (error){
			// This catch block will handle errors that occur *before* the db.query callback is executed.
			// For example, if db.query itself throws an error.
			console.error("Error during query execution:", error);
    		return res.status(500).json({ error: 'Unexpected server error' });
		}finally{
			closeDb(db)
		}
		//end try
    }).catch((error)=>{
        res.status(500).json({error:'Error'})
    }) 
})

//=============END ADD RIDER TRANSACTION J&T GRP====//
//===get chart data
const getChartData= (req,res, retdata) =>{

	const [datestr, datetimestr] = nuDate()
	

	//=== GET REALTIME DATA========
	sql = `SELECT 
		a.region,
		count(c.xname) as reg,
		count(b.emp_id) as logged,
		COALESCE(CAST(round( count(b.emp_id)  / count(c.xname) *100,0) AS SIGNED),0)  as attendance_pct,
		COALESCE(CAST(round(SUM(b.parcel),0)AS SIGNED),0) AS parcel,
		COALESCE(CAST(round(SUM(b.actual_parcel),0)AS SIGNED), 0) AS parcel_delivered,
		COALESCE(round(SUM(b.amount),2), 0) AS amount,
		COALESCE(round(SUM(b.actual_amount),2), 0) AS amount_remitted,
		COALESCE(CAST(round( SUM(b.actual_parcel) / SUM(b.parcel)*100,0)AS SIGNED),0) as qty_pct
		FROM asn_hub a
		LEFT JOIN asn_users c 
		ON c.hub = a.hub
		LEFT JOIN asn_transaction b 
		ON b.emp_id = c.id
		and b.created_at = '${datestr}' 
		and c.grp_id = 1 and c.active = 1  
		GROUP BY a.region
		ORDER by a.region;
		
		
		`

		
		// SELECT a.region, 
		// a.area, 
		// COALESCE(round(SUM(b.parcel)), 0) AS parcel, 
		// COALESCE(round(SUM(b.actual_parcel)), 0) AS parcel_delivered, 
		// COALESCE(round(SUM(b.amount),2), 0) AS amount, 
		// COALESCE(round(SUM(b.actual_amount),2), 0) AS amount_remitted, 
		// COALESCE(round( SUM(b.actual_parcel) / SUM(b.parcel)*100,0),0) as qty_pct 
		// FROM asn_hub a 
		// LEFT JOIN asn_users c 
		// ON c.hub = a.hub 
		// LEFT JOIN asn_transaction b 
		// ON b.emp_id = c.id 
		// and b.created_at like '2025-06%' 
		// where c.grp_id=1 and c.active=1
		// GROUP BY a.region,a.area O
		// ORDER by parcel_delivered DESC, a.region;
		



	//console.log('===== ',sql )
	connectDb()
    .then((db)=>{  
		
		try{
			db.query( sql,
				(err,result)=>{
			
				if (err) {
					console.error("get data error getchartdata()", err);
					//results[0].
					return res.send(500).json({						
						error:err
					})
				}else{
					//results[0]
					//=====SEND TO RIDER
					//sendSocket(result)
					res.status(200).json( { success:'ok',data:result} )
 
				}//eif
					
			});//END DB QUERY

		}catch (error){
			// This catch block will handle errors that occur *before* the db.query callback is executed.
			// For example, if db.query itself throws an error.
			console.error("Error during query execution:", error);
    		return res.status(500).json({ error: 'Unexpected server error' });
		}finally{
			closeDb(db)
		}
		//end try
	})

}//end func

//===socket emit
const sendSocket = (xdata) => {
	io.emit('potek', xdata)
	console.log('io.emit sakses',xdata)
}


//===== piechart for rider====// 
router.get('/getpiedata/:empid', async(req,res)=>{

	var series = new Date() 
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	series = yyyy+'-'+mm
	
	console.log('/getpiedata()')

	connectDb()
    .then((db)=>{
		let sql =`select 
			round( ( sum(actual_parcel) / sum(parcel) )   * 100 ) as delivered_pct,
			round( 100 - ( sum(actual_parcel) / sum(parcel) ) * 100 ) as undelivered_pct,
			created_at,
			emp_id
			from asn_transaction
			where SUBSTRING(created_at,1,7) like '${series}%' 
			and emp_id ='${req.params.empid}' `
	
		//console.log( sql )

		db.query( sql, (error, results)=>{
			//console.log(error,results)	 

			closeDb(db)

			res.status(200).json({data:results})
		})

	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	}) 

})
//===== end piechart for rider====//

//===test menu-submenu array->json--->
router.get('/xmenu/:grpid', async(req,res)=>{
	connectDb()
    .then((db)=>{ 

		sql2 =`SELECT 
			grp_id,
			menu, menu_icon,
			JSON_ARRAYAGG(
						JSON_OBJECT(
							'sub', submenu,
							'icon', submenu_icon
						)
					) AS list
			FROM asn_menu 
			WHERE grp_id = ${req.params.grpid}`

		//console.log(sql)
		console.log(sql2)

		db.query( sql2 , null , (error, results)=>{
			console.log( error,results )
		})

	}).catch((error)=>{
        res.status(500).json({error:'Error'})
    }) 

})

//===test menu-submenu array->json--->
router.get('/menu/:grpid', async(req,res)=>{
	console.log('=== menu()')
	connectDb()
	.then((db)=>{ 

		sql2 = `SELECT menu,
			menu_icon,
			grouplist, 
			JSON_ARRAYAGG( 
			JSON_OBJECT( 'sub', submenu, 'icon', submenu_icon, 'href', href )) AS list 
			FROM asn_menu 
			WHERE FIND_IN_SET('${req.params.grpid}', grouplist)> 0 
			GROUP BY menu 
			ORDER BY sequence;`
		//console.log(sql)
		//console.log(sql2)

		db.query( sql2 ,  (error, results)=>{
			//console.log( error,results )
			res.status(200).json( results )
		})

	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	}) 

})


//==== for grid monthly transaction riders =======//
router.get('/gridmonthlytransaction/:empid', async(req,res)=>{
	var series = new Date() 
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	const xseries = yyyy+'-'+mm +'-01'
	const series2 = yyyy+'-'+mm

	if(typeof req.params.empid === 'undefined'){
		return res.status(500).json({error:'Error! Please Try Again!'})
	}

	//console.log( 'series2 ',series2 )

	connectDb()
    .then((db)=>{ 

		//====take-out comma after sql statement it will error if multiple statements is set to true
		//DATE_FORMAT(a.Dates,'%d-%b %Y, %a') as Dates
		sql = `
			select DATE_FORMAT(a.Dates,'%Y-%m-%d') as Dates
			from ( select last_day('${xseries}') - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY as Dates
			from (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as a cross 
			join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as b cross 
			join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as c ) a
			where a.Dates between '${xseries}' and last_day('${xseries}') order by a.Dates`

		sql2 =`SELECT id,emp_id,
				transaction_number,
				sum(parcel) as parcel,
				sum(actual_parcel) as actual_parcel,
				sum(amount) as amount,
				sum(actual_amount) as actual_amount,
				remarks,
				DATE_FORMAT(created_at,'%Y-%m-%d') as created_at
				FROM asn_transaction
				WHERE SUBSTRING(created_at,1,7) like '${series2}%' 
				and emp_id =${req.params.empid} 
				GROUP BY DATE_FORMAT(created_at,'%Y-%m-%d') `	 

		//console.log(sql)
		//console.log(sql2)
		
		db.query( `${sql}; ${sql2}`, [null, null], (error, results)=>{

			//console.log(results[0],results[1])
			
			let trans, tick

			if(!results[0]){
				
				closeDb(db)

				res.status(500).json({error:'Error'})
			}

			for(let zkey in results[0]){
				
				trans = results[1].findIndex( x => x.created_at === results[0][zkey].Dates)
				
				results[0][zkey].Dates=`${results[0][zkey].Dates}`

				if(trans<0){ //no record
					tick= ""	
					results[0][zkey].parcel = 0
					results[0][zkey].delivered = 0
					results[0][zkey].total_amount = 0
					results[0][zkey].amount_remitted = 0
					results[0][zkey].remarks = ""
					//results[0][zkey].Dates = null
				}else{

					tick=`${results[1][trans].actual_parcel}`
					
					results[0][zkey].parcel = results[1][trans].parcel
					results[0][zkey].delivered = tick
					results[0][zkey].total_amount = parseFloat(results[1][trans].amount)
					results[0][zkey].amount_remitted = parseFloat(results[1][trans].actual_amount)
					results[0][zkey].remarks = results[1][trans].remarks
					//results[0][zkey].Dates = results[1][trans].created_at

				}//eif
			}//endfor

			///console.log( results[0])

			closeDb(db);//CLOSE connection
			//console.log(xtable)
			res.status(200).json( results[0] )
		})
	
	}).catch((error)=>{
        res.status(500).json({error:'Error'})
    }) 
})

//============= get monthly transaction riders =======//
router.get('/getmonthlytransaction/:empid', async(req,res)=>{
	var series = new Date() 
	var mm = String( series.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = series.getFullYear()

	series = yyyy+'-'+mm +'-01'
	const series2 = yyyy+'-'+mm

	//console.log( 'series2 ',series2 )

	let sql, sql2

	connectDb()
    .then((db)=>{ 

		//====take-out comma after sql statement it will error if multiple statements is set to true
		//DATE_FORMAT(a.Dates,'%d-%b %Y, %a') as Dates
		sql = `
			select DATE_FORMAT(a.Dates,'%Y-%m-%d') as Dates
			from ( select last_day('${series}') - INTERVAL (a.a + (10 * b.a) + (100 * c.a)) DAY as Dates
			from (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as a cross 
			join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as b cross 
			join (select 0 as a union all select 1 union all select 2 union all select 3 union all select 4 union all select 5 union all select 6 union all select 7 union all select 8 union all select 9) as c ) a
			where a.Dates between '${series}' and last_day('${series}') order by a.Dates`

		sql2 =`SELECT * from
				where SUBSTRING(created_at,1,7) like '${series2}%' 
				and emp_id ='${req.params.empid}' `	

		//console.log(sql)
		//console.log(sql2)
		
		let xtable = `
			<table class="table"> 
			<thead>
				<tr>
				<th>Date</th>
				<th>Parcel</th>
				<th>Delivered>
				<th>Total Amount</th>
				<th>Amount Remitted</th>
				<th>Remarks</th>
				</tr>
			</thead>
			<tbody>`

		db.query( `${sql}; ${sql2}`, [null, null], (error, results)=>{

		console.log(results[0],results[1])
			let trans, tick

			for(let zkey in results[0]){

				trans = results[1].findIndex( x => x.created_at === results[0][zkey].Dates)

				if(trans<0){ //no record
					tick= null
				}else{
					if( parseInt(results[1][trans].parcel) > parseInt(results[1][trans].actual_parcel) ){
						tick=`<i class="ti ti-arrow-down-right text-danger"></i>&nbsp;${results[1][trans].actual_parcel}`
					}else{
						tick= results[1][trans].actual_parcel
					}
					
				}//eif
				

				xtable+= `<tr>
				<td>${results[0][zkey].Dates}&nbsp;${(trans>=0 ? '<i style="color:green;font-size:15px;" class="ti ti-check"></i>': '<i style="color:red;font-size:11px;" class="ti ti-x"></i>')}</td>
				<td >${(trans>=0 ? results[1][trans].parcel : '&nbsp;')}</td>
				<td >${(trans>=0 ? tick : '&nbsp;')}</td>
				<td >${(trans>=0 ? results[1][trans].amount : '&nbsp;')}</td>
				<td >${(trans>=0 ? results[1][trans].actual_amount : '&nbsp;')}</td>
				<td >${(trans>=0 ? results[1][trans].remarks : '&nbsp;')}</td>
				<tr>`

			}//endfor

			xtable+=	
			`</tbody>
			</table>`

			closeDb(db);//CLOSE connection
			//console.log(xtable)
			res.status(200).send(xtable)
		})
	
	}).catch((error)=>{
        res.status(500).json({error:'Error'})
    }) 
})
//============= end get monthly transaction riders =====//

//======================ADD NEW EMPLOYEE ====================
// Create a new employee (CREATE)
let myfile
router.post('/newemppost/', async (req, res) => {
    //const { employeeId, full_name, email, phone, birth_date, hire_date, job_title, department, employment_status, address } = req.body;

	myfile = req.body.employeeId
	console.log('data is', req.body.fullName.toUpperCase(), req.body.birthDate , req.body.jobTitle)
	
   	connectDb()
    .then((db)=>{

	//$sql = `INSERT INTO asn_employees (emp_id, full_name, email, phone, birth_date, hire_date, job_title, department, employment_status, address) 
	//VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`
	
			
		$sql = `INSERT INTO asn_employees (emp_id, full_name, email, phone, birth_date, hire_date, job_title, department, employment_status, address) 
		VALUES (?,?,?,?,?,?,?,?,?,?) `
			
		db.query( $sql,
			[	req.body.employeeId, 
				req.body.fullName.toUpperCase(), 
				req.body.email, 
				req.body.phone, 
				req.body.birthDate, 
				req.body.hireDate, 
				req.body.jobTitle,
				req.body.department, 
				req.body.employmentStatus, 
				req.body.address ],
			(error,result)=>{
				console.log('inserting..',result.rowCount)

				//results[0]
				res.json({
					message: "Employee Number " + myfile +" Added Successfully!",
					voice:"Employee Number " + myfile +" Added Successfully!",
					approve_voice:`You have another item added in Inventory`,
					status:true
				})
	
				closeDb(db);//CLOSE connection
			
		})
		
    }).catch((error)=>{
        res.status(500).json({error:'Error'})
    }) 
});

//==============busboy, basic-ftp  for file uploading============
const Busboy = require('busboy')
const {Client} = require("basic-ftp")

//================ post image ==================//
router.post('/postimage/:transnumber',   async (req, res) => {
	console.log('===FIRING /postimage===', req.params.transnumber )

	const busboy = Busboy({ headers: req.headers });
		
	busboy.on('file', function(fieldname, file, filename) {

		console.log( 'firing busboy on file() ==', filename, fieldname, path.extname( filename.filename) )
		
		let extname

		if( path.extname(filename.filename) ===".jpg" ||  path.extname(filename.filename) ==='.jpeg' ||  path.extname(filename.filename) ==='.png' ||  path.extname(filename.filename) ==='.gif'){
			extname = ".jpg"
		}else{
			extname = path.extname(filename.filename)
		} 
		
		// fieldname is 'fileUpload'
		//var fstream = fs.createWriteStream('ASN-'+ filename + extname);
		var fstream = fs.createWriteStream(`${req.params.transnumber}` + extname);

		file.pipe(fstream);
			
		console.log( 'Writing Stream... ', fstream.path )

		file.resume()

		fstream.on('close', function () {
			console.log('Closing Stream, Trying to Up load...')

			console.log('Compacting file size.... ')

			var xfile = 'A_'+fstream.path

			sharp( fstream.path ).resize({width:500}).jpeg({ quality: 30 }).toFile(xfile, async(err,info)=>{

				//console.log(err,'?')
				if(!err){

					const client = new Client()
					//client.ftp.verbose = true

					try{
						await client.access({
							host: "ftp.asianowapp.com",
							user: "u899193124.0811carlo",
							password: "u899193124.Asn",
						})

						client.trackProgress(info => {
							console.log("file", info.name)
							console.log("transferred overall", info.bytesOverall)
						})

						await client.uploadFrom(xfile, xfile)

						fs.unlink( xfile,()=>{
							console.log('===Delete temp file on Hostinger==== ', xfile )
	
							fs.unlink( fstream.path ,()=>{
								console.log('===Delete temp file on Hostinger==== ', fstream.path )
								return res.status(200).send({ status: true });	
							})	
	
						})

					}
					catch(err){
						console.log(err)
					}

					client.close()
				
				
				}//eif err

			}) //end sharp

		})//====end fstream
	})//===end busboy on file 
	
	busboy.on('finish',()=>{
		console.log('busboy finish')
	}) //busboy on finish

	//write file
	req.pipe(busboy)
	
}) //==============end post image =============//

//==============busboy, scp2  for file uploading============

router.post('/uploadpdf',  async(req, res)=>{

	console.log('===FIRING uploadpdf()===')

	const busboy = Busboy({ headers: req.headers });
		
	busboy.on('file', function(fieldname, file, filename) {
		console.log( 'firing busboy on file() ==', mycookie,filename)

		// fieldname is 'fileUpload'
		var fstream = fs.createWriteStream(mycookie +'.pdf');
		
		file.pipe(fstream)
			
		console.log( 'Writing Stream... ', fstream.path )

		file.resume()

		fstream.on('close', function () {
			console.log('Closing Stream, Trying to Up load...')
			ftpclient.scp(fstream.path, {
				host: "gator3142.hostgator.com", //--this is orig ->process.env.FTPHOST,
				//port: 3331, // defaults to 21
				username: "vantazti", // this is orig-> process.env.FTPUSER, // defaults to "anonymous"
				password: "2Timothy@1:9_10",
				path: 'public_html/osndp/'
			}, function(err) {
				console.log("File Uploaded!!!");
				
				//==delete file
				fs.unlink( fstream.path,()=>{
					console.log('Delete temp file ', fstream.path)
					res.status(200).send({ success: true });
				})

			})
			
		}); 
	});
	
	busboy.on('finish',()=>{
		console.log('busboy.on.finish() DONE!==')
	}) //busboy on finish

	//write file
	req.pipe(busboy)
		
})//==end upload


const csvParser = require('csv-parser');

//=== FINAL FOR CLAIMS
router.post('/claims', async( req, res) => {
	console.log('===FIRING /claims===')

	const busboy = Busboy({ headers: req.headers });
		
	busboy.on('file', function(fieldname, file, filename) {

		console.log( 'firing busboy on Excel file() ==', filename, fieldname, path.extname( filename.filename) )
		
		let extname

		if( path.extname(filename.filename) ===".csv"  ){
			extname = ".csv"
		}else{
			extname = path.extname(filename.filename)
		}

		const final_file =`ASN-${getRandomPin('0123456789',4)}.csv`
		
		// fieldname is 'fileUpload'
		var fstream = fs.createWriteStream( final_file );
		
		file.pipe(fstream);
			
		console.log( 'Writing Excel file Stream... ', fstream.path )

		file.resume()

		fstream.on('close', async function () {
			console.log('Closing Stream, Trying to Up load to POSTGRES...')
			
			const dbconfig  ={
                host: 'srv1759.hstgr.io',
                user: 'u899193124_asianow',
                password: 'g12@c3M312c4',
                database: 'u899193124_asianow'
            }
			const conn = await mysqls.createConnection(dbconfig);

			//console.log(conn)
			fs.createReadStream(fstream.path)
				.pipe(csvParser())
				.on('data', async(row)=>{
					//console.log('this is row',row)
					const { batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, amt } = row ;
					const query = `INSERT INTO asn_claims (batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, amount) 
								VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
					//console.log( query ,batch_id,emp_id,full_name)
					
					await conn.execute( query , [batch_id,emp_id,full_name, track_number, claims_reason, category, hubs_location, amt])
					//await conn.end()							
				})
				.on('end', async()=>{
					fs.unlinkSync(fstream.path); // Remove the file after processing
					
					await conn.end()

			 		console.log('CLOSING STREAM.. CSV UPLOADED SUCCESSFULLY!')
			 		return res.status(200).json({message:'Claims Upload Successfully!',status:true})
				})
				.on('error',(err)=>{
					console.log('Error processing csv')
					res.status(500).send('Error processing csv')
				})

		})//====end fstream
	})//===end busboy on file 
	
	busboy.on('finish',()=>{
		console.log('busboy finish')
	}) //busboy on finish

	//write file
	req.pipe(busboy)
	
})

//===========BULK INSERT CSV================
router.get('/copy-data', async (req, res) => {
	try {
		// You need to have a CSV file available to copy from
		const filePath = '/path/to/your/file.csv';
		
		// You can read the file and use COPY FROM STDIN method
		const client = await pool.connect();
		const query = `COPY your_table FROM STDIN WITH (FORMAT csv)`;

		const stream = client.query(copyFrom(query));
		const fileStream = fs.createReadStream(filePath);

		fileStream.on('error', (error) => {
		console.error('File stream error:', error);
		res.status(500).send('Error reading the file');
		});

		stream.on('end', () => {
		client.release();
		res.status(200).send('Data copied successfully');
		});

		stream.on('error', (error) => {
		client.release();
		console.error('Database stream error:', error);
		res.status(500).send('Error copying data');
		});

		fileStream.pipe(stream);

	} catch (error) {
		console.error('Error in /copy-data:', error);
		res.status(500).send('Error processing request');
	}
});

//============END BULK INSERT CSV ===========

//=================function getting drnumber ======//
const drseq = () => {
	var today = new Date() 
	var dd = String(today.getDate()).padStart(2, '0')
	var mm = String(today.getMonth() + 1).padStart(2, '0') //January is 0!
	var yyyy = today.getFullYear()

	today = yyyy+ mm +dd

	const sqlu = "update dr_seq set sequence = sequence +1;"
	connectDb()
	.then((db)=>{
		db.query(sqlu , null ,(error,results) => {	
			//console.log('UPDATE DR SEQ', results)
		})
	})

	return today
}

///===== get update total claims
router.get('/claimsupdate/:eregion/:email', async (req,res)=>{

	if(req.params.eregion !== 'ALL'){

		sql = `select distinct( DATE_FORMAT(a.uploaded_at,'%M %d, %Y')) as xdate, 
		format(sum(a.amount),2) as total
		from asn_claims a
		join (select distinct hub, email from asn_spx_hubs ) b
		on a.hubs_location = b.hub
		where b.email = '${req.params.email}' and (a.pdf_batch is null or a.pdf_batch = "")
		group by a.uploaded_at
        order by a.uploaded_at;`
		// sql = `select distinct( DATE_FORMAT(a.uploaded_at,'%M %d, %Y')) as xdate, 
		// round(sum(a.amount)) as total,
		// b.email 
		// from asn_claims a
		// join asn_spx_hubs b
		// on a.hubs_location = b.hub
		// group by a.uploaded_at,b.email,a.pdf_batch
		// having b.email = '${req.params.email}' and (a.pdf_batch is null or a.pdf_batch = "")
		// order by a.uploaded_at DESC limit 4;`
	}else{

		sql = `
		select distinct( DATE_FORMAT(a.uploaded_at,'%M %d, %Y')) as xdate, 
		format(sum(a.amount),2) as total
		from asn_claims a
		group by a.uploaded_at
		order by a.uploaded_at;
		`
		/*
		sql = `select distinct( DATE_FORMAT(a.uploaded_at,'%M %d, %Y')) as xdate, 
		round(sum(a.amount)) as total
		from asn_claims a
		join asn_spx_hubs b
		on a.hubs_location = b.hub
		group by a.uploaded_at,a.pdf_batch
		having a.pdf_batch is null or a.pdf_batch = ""
		order by a.uploaded_at DESC limit 4;`
		*/
	}
	
	console.log(sql)
	connectDb()
	.then((db)=>{
		db.query(`${sql}`,(error,results) => {	
			if ( results.length == 0) {   //data = array 
				console.log('no rec')
				closeDb(db);//CLOSE connection
		
				res.status(500).send('** No Record Yet! ***')
		
			}else{ 
				let xtable = '', xtotal = 0

				//iterate top 10
				xtable += `<ul>`
				for(let zkey in results){

					xtotal += parseFloat(results[zkey].total.replaceAll(',',''))
					//console.log(results[zkey].total.replaceAll(',',''))
					xtable+= `
					<li class="timeline-item d-flex position-relative overflow-hidden">
					<div class="timeline-time text-dark flex-shrink-0 text-end">${results[zkey].xdate}</div>
					<div class="timeline-badge-wrap d-flex flex-column align-items-center">
						<span class="timeline-badge border-2 border border-primary flex-shrink-0 my-8"></span>
						<span class="timeline-badge-border d-block flex-shrink-0"></span>
					</div>
					<div class="timeline-desc fs-3 text-dark mt-n1">Claims Update <p class='border border-success  text-primary align-right'>
						<b>P ${results[zkey].total}</b></p></div>
					</li>`
				}

				/*
				<div class="timeline-desc fs-3 text-dark mt-n1">Claims Update <p class='border border-success  text-primary align-right'>
						<b>P ${addCommas(parseFloat(results[zkey].total).toFixed(2))}</b></p></div>
					</li>*/

				xtable+=`</ul><input type='text' hidden id='gxtotal' name='gxtotal' value='${addCommas(parseFloat(xtotal).toFixed(2))}'>`

				closeDb(db);//CLOSE connection
			
				res.status(200).send(xtable)				
			
			}

		})
	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	}) 

})

//==========top 10 
router.get('/gethub/:region/:email', async(req, res)=>{
	
	if(req.params.region !== 'ALL'){
		sql = `SELECT distinct(a.hubs_location) as hub, 
			sum( a.amount ) as total ,
			b.region as region,
			b.email
			from asn_claims a
			join asn_spx_hubs b
			on a.hubs_location = b.hub
			group by a.hubs_location,b.region,a.pdf_batch
			having b.email = '${req.params.email}' and (a.pdf_batch is null or a.pdf_batch = "")
			order by sum(a.amount) desc LIMIT 5`
	}else{
		sql = `SELECT distinct(a.hubs_location) as hub, 
		round(sum( a.amount )) as total ,
		 (select distinct x.region from asn_spx_hubs x where x.hub = a.hubs_location limit 1) as region
		from asn_claims a 
		where a.pdf_batch is null or a.pdf_batch = "" 
		group by a.hubs_location 
		order by sum(a.amount) desc LIMIT 5;`
	}
	
	//console.log(sql)
	console.log('Top 5 Hub processing...')
	connectDb()
	.then((db)=>{
		db.query(`${sql}`,(error,results) => {	
		
			if ( results.length == 0) {   //data = array 
				console.log('no rec')
				closeDb(db);//CLOSE connection
		
				res.status(500).send('** No Record Yet! ***')
		
			}else{ 
			
				let xtable = 
				
				`
				<h2>(${req.params.region.toUpperCase()})</h2>
				<div class="col-lg-8">
					<table class="table"> 
					<thead>
						<tr>
						<th>Region</th>
						<th>Hub Location</th>
						<th>Amount</th>
						</tr>
					</thead>
					<tbody>`

					//iterate top 10
					for(let zkey in results){
						xtable+= `<tr>
						<td>${results[zkey].region}</td>
						<td >${results[zkey].hub}</td>
						<td align='right'><b>${addCommas(parseFloat(results[zkey].total).toFixed(2))}</b></td>
						<tr>`

					}//endfor

					xtable+=	
					`</tbody>
					</table>
					</div>`

					closeDb(db);//CLOSE connection
		
					res.status(200).send(xtable)				
				
			}//eif
		
		})

	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	}) 
})

//================= TOP 5 RIDER
router.get('/getrider/:eregion/:email', async(req, res)=>{

	if( req.params.eregion!=='ALL'){
		sql = `SELECT distinct( a.emp_id) as emp_id,
		(a.full_name) as rider, 
		a.hubs_location as hub, 
		b.email,
		sum( a.amount ) as total , 
		b.region as region
		from asn_claims a 
		join asn_spx_hubs b 
		on a.hubs_location = b.hub 
		group by a.emp_id, b.email,a.emp_id ,a.pdf_batch
		having b.email = '${req.params.email}' and (a.pdf_batch is null or a.pdf_batch = "")
		order by sum(a.amount) desc LIMIT 5;`
	}else{
		sql =`SELECT distinct(a.emp_id) as emp_id,
		(a.full_name) as rider,
		round(sum( a.amount )) as total,
        a.hubs_location as hub,
        (select distinct x.region from asn_spx_hubs x where x.hub = a.hubs_location limit 1) as region
		from asn_claims a 
        where  a.pdf_batch is null
		group by a.emp_id,a.pdf_batch
		order by sum(a.amount) desc, a.full_name LIMIT 5;`
	}

	
	
	console.log('Top 5 Rider processing...')
	
	connectDb()
	.then((db)=>{
		db.query(`${sql}`,(error,results) => {	
		
			if ( results.length == 0) {   //data = array 
				console.log('no rec')
				closeDb(db);//CLOSE connection
		
				res.status(500).send('** No Record Yet! ***')
		
			}else{ 
			
				let xtable = 
					`<div class="col-lg-8">
					<h2>(${req.params.eregion.toUpperCase()})</h2>
					<table class="table"> 
					<thead>
						<tr>
						<th>Rider</th>
						<th align=right>Amount</th>
						</tr>
					</thead>
					<tbody>`

					//iterate top 10
					for(let zkey in results){
						xtable+= `<tr>
						<td>
						${results[zkey].rider}<br>
						${results[zkey].emp_id}<br>
						( ${results[zkey].region}, ${results[zkey].hub} )<br> 
						</td>
						<td align='right' valign='bottom'><b>${addCommas(parseFloat(results[zkey].total).toFixed(2))}</b>&nbsp;&nbsp;&nbsp;&nbsp;</td>
						</tr>`

					}//endfor

					xtable+=	
					`</tbody>
					</table>
					</div>`

					closeDb(db);//CLOSE connection
		
					res.status(200).send(xtable)				
				
			}//eif
		
		})

	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	}) 

})
//======= end top 10


router.get('/getfinance/:region/:email', async( req, res) =>{
	
	sql = `SELECT distinct(a.hubs_location) as hub, 
			sum( a.amount ) as total ,
			b.region as region,
			b.email
			from asn_claims a
			join asn_spx_hubs b
			on a.hubs_location = b.hub
			group by a.hubs_location,b.region
			having b.region = '${req.params.region}'
			`

	console.log(sql)
	console.log('LIST OF ATDS FOR CROSSCHEK...')
	connectDb()
	.then((db)=>{
		db.query(`${sql}`,(error,results) => {	
		
			if ( results.length == 0) {   //data = array 
				console.log('no rec')
				closeDb(db);//CLOSE connection
		
				res.status(500).send('** No Record Yet! ***')
		
			}else{ 
			
				let xtable = 
				
				`
				<h2>(${req.params.region.toUpperCase()})</h2>
				<div class="col-lg-8">
						<table class="table"> 
					<thead>
						<tr>
						<th>Region</th>
						<th>Hub Location</th>
						<th>Amount</th>
						</tr>
					</thead>
					<tbody>`

					//iterate top 10
					for(let zkey in results){
						xtable+= `<tr>
						<td>${results[zkey].region}</td>
						<td >${results[zkey].hub}</td>
						<td align='right'><b>${addCommas(parseFloat(results[zkey].total).toFixed(2))}</b></td>
						<tr>`

					}//endfor

					xtable+=	
					`</tbody>
					</table>
					</div>`

					closeDb(db);//CLOSE connection
		
					res.status(200).send(xtable)				
				
			}//eif
		
		})

	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	}) 
})

//search by id or name
router.get('/getrecord/:enum/:ename/:region/:email', async(req, res)=>{
	let sql, sqlz = ""

	if(req.params.region=="2"){
		sqlz = `, (select distinct x.email from asn_spx_hubs x where x.email = '${req.params.email}' limit 1) as email`
	}else{

	}

	if ( req.params.ename!=="blank" &&  req.params.enum!== "blank"){
		sql = 
		`SELECT distinct(a.full_name) as rider, 
		a.hubs_location as hub, 
		b.email, 
		a.emp_id,
		sum( a.amount ) as total , 
		a.category,
		b.region as region ,
		a.pdf_batch,
		a.batch_file
		from asn_claims a 
		join asn_spx_hubs b 
		on a.hubs_location = b.hub 
		group by a.full_name, a.email, a.emp_id  
		having ( a.emp_id like '%${req.params.enum}%' or upper(a.full_name) like '%${req.params.ename.toUpperCase()}%')
		${sqlz}
		order by a.full_name desc LIMIT 10;`	
	
 	}else if( req.params.enum!== "blank"  &&  req.params.ename == "blank"){

		sql = 
		`SELECT distinct(a.emp_id) as emp_id,
		(a.full_name) as rider,
		round(sum( a.amount )) as total,
        a.hubs_location as hub,
		a.batch_file,
		a.pdf_batch,
        (select distinct x.region from asn_spx_hubs x where x.hub = a.hubs_location limit 1) as region
		${sqlz}
		from asn_claims a 
        where  a.emp_id = '${req.params.enum}' 
		group by a.emp_id,a.pdf_batch
		order by sum(a.amount) desc, a.full_name;`	
		
		
	}else if ( req.params.ename!=="blank"  &&  req.params.enum == "blank"){
		sql = `SELECT distinct(a.emp_id) as emp_id,
		(a.full_name) as rider,
		round(sum( a.amount )) as total,
        a.hubs_location as hub,
		a.batch_file,
		a.pdf_batch,
        (select distinct x.region from asn_spx_hubs x where x.hub = a.hubs_location limit 1) as region
		${sqlz}
		from asn_claims a 
        where  upper(a.full_name) like '%${req.params.ename.toUpperCase()}%' 
		group by a.emp_id,a.pdf_batch
		order by sum(a.amount) desc, a.full_name LIMIT 1;`	
	}//eif

	console.log( 'Search Claims processing...')
	console.log(sql)
	
	connectDb()
	.then((db)=>{
		db.query(`${sql}`,(error,results) => {	
		     console.log( results)
			if ( ! results ) {   //data = array 
				console.log('no rec')
				closeDb(db);//CLOSE connection
		
				res.status(500).send('** No Record Yet! ***')
		
			}else{ 
			
				let pdfbatch

				console.log(results)

				
				if( results[0].pdf_batch!==null ){
					pdfbatch = "ATD # " + results[0].pdf_batch
				}else{
					pdfbatch = "ATD PDF NOT YET PROCESSED"
				}
				let xtable = 
				`<div class="col-lg-8">
					<div class='ms-2'><H2 style="color:#dc4e41">${pdfbatch}</H2></div>
				<table class="table w-100	" > 
				<thead>
					<tr>
					<th>Rider</th>
					<th align=right>Amount</th>
					</tr>
				</thead>
				<tbody>`

				//iterate top 10
				let total_amt = 0
				for(let zkey in results){
					total_amt+=parseFloat(results[zkey].total)

					xtable+= `<tr>
					<td>
					<span class='a2'>${results[zkey].rider}</span><br>
					<span class='a3'>${results[zkey].emp_id}</span><br>
					<span class='a3'>${results[zkey].hub}</span><br>
					<span class='a3'>Batch # ${results[zkey].batch_file}</span>
					
					</td>
					<td align='right' valign='bottom'><b>${addCommas(parseFloat(results[zkey].total).toFixed(2))}</b></td>
					</tr>`

				}//endfor
				let visible

				if(results.rowCount>1){
					visible = "disabled"	
				}else{
					visible = ""
				}
				xtable+=

				`<tr>
				<td  align=right><b>TOTAL : </b></td>
				<td align=right><b> ${addCommas(parseFloat(total_amt).toFixed(2))}</b></td>
				</tr>
				<tr>
				<td colspan=2>
				<button id='download-btn' type='button' class='btn btn-primary' onclick="javascript:asn.checkpdf('${results[0].emp_id}')"><i class='ti ti-download'></i>&nbsp;Download PDF</button>
				</td>
				</tr>
				</tbody>
				</table>
				</div>`

				closeDb(db);//CLOSE connection
	
				res.status(200).send(xtable)				
				
			}//eif
		
		})

	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	}) 

})

//=====https://localhost:3000/q/6/2 
router.get('/getlistpdf/:limit/:page', async(req,res) => {
	
	console.log(`firing getlistpdf/${req.params.limit}/${req.params.page}`)

	const limit_num = 30 //take out Mar 27,2025 req.params.limit, make a hard value of 30
	let nStart = 0	
	let page = req.params.page
	
	connectDb() 
	.then((db)=>{
		
		let sql = `SELECT distinct(a.emp_id) as emp_id,
		a.full_name as rider,
		round(sum( a.amount )) as total,
        a.hubs_location as hub,
        (select distinct x.region from asn_spx_hubs x where x.hub = a.hubs_location limit 1) as region
		from asn_claims a 
        group by a.emp_id,a.pdf_batch
		HAVING a.pdf_batch like 'ASN%'
		order by a.pdf_batch asc; `
		
		//console.log(sql)
		
		let reccount = 0
		
		db.query( `${sql}`,null,(err,xresult)=>{
			
			if(!xresult){
				res.send("<span class='text-primary'>** No Data Found!!!**</span>")
			}else{

				reccount = xresult.length
				//==== for next
				let aPage = []
				let pages = Math.ceil( xresult.length / limit_num )
				
				nStart = 0
				
				for (let i = 0; i < pages; i++) {
					aPage.push(nStart)
					nStart += parseInt(limit_num)
				}//==next
				
				//console.log('offset ',aPage)
				//===get from json field 
				let sql2 = 
					`SELECT distinct(a.emp_id) as emp_id,
					a.full_name as rider,
					round(sum( a.amount )) as total,
					a.hubs_location as hub,
					a.pdf_batch,
					(select distinct x.region from asn_spx_hubs x where x.hub = a.hubs_location limit 1) as region
					from asn_claims a 
					group by a.emp_id, a.pdf_batch
					HAVING a.pdf_batch like 'ASN%'
					order by a.pdf_batch asc
					LIMIT ${limit_num} OFFSET ${aPage[page-1]};`
				
				//onsole.log(sql2)
				

				db.query(`${sql2}`,null,(err,xdata)=>{
				
					let  xtable =
					`<div class="col-lg-8">
					<table class="table"> 
					<thead>
						<tr>
						<th>Rider</th>
						<th>Pdf Batch</th>
						<th align=right>Amount</th>
						</tr>
					</thead>
					<tbody>`

					
					let randpct, issues

					for (let zkey in xdata){

						randpct = Math.floor((Math.random() * 100) + 1);
						issues  = Math.floor((Math.random() * 15) + 1);
						//let randpct2 = (100-randpct)y
						//taken out <td>${data.rows[ikey].id}</td>
						
						xtable += `<tr>
						<td>
						${ xdata[zkey].rider}<br>
						${ xdata[zkey].emp_id}<br>
						( ${ xdata[zkey].region}, ${ xdata[zkey].hub} )<br> 
						</td>
						<td> ${ xdata[zkey].pdf_batch} </td>
						<td align='right' valign='bottom'><b>${addCommas(parseFloat( xdata[zkey].total).toFixed(2))}</b></td>
						</tr>`
					}//=======end for
					
					
					//console.log( xtable )
					let xprev = ((page-1)>0?'':'disabled')
					let xnext = ((page>=pages)?'disabled':'')
					let mypagination = "", main = "", xclass = ""
					//===mypagination is for pagination
					
					//===final pagination
					mypagination+=`
					<nav aria-label="Page navigation example">
					  <ul class="pagination">`
					
					//==== previous link
					mypagination += `<li class="page-item ${xprev}">
					<a class="page-link" href="javascript:asn.getListPdf(${parseInt(req.params.page)-1 })">Previous</a></li>`
					
					for(let x=0; x < pages; x++){
						
						if( req.params.page==(x+1)){
							xclass = "disabled"
						}else{
							xclass = ""
						}
						//==== number page
						mypagination += `<li class="page-item ${xclass}">
						<a class="page-link"  href="javascript:asn.getListPdf(${x+1})">${x+1}</a></li>`
						
					}//end for
					
					//=======next link
					mypagination += `<li class="page-item ${xnext}">
					<a class="page-link" href="javascript:asn.getListPdf(${parseInt(req.params.page)+1})">Next</a></li>`
					
					mypagination+=`
					</ul>
					</nav>`
					
					//=== if u add column in tables
					// === add also colspan=??
					xtable += `
						<tr>
						<td colspan=4 align='center'>
						 ${mypagination}<div id='reccount' style='visibility:hidden' >${reccount}</div>
						</td>
						</tr>
						</TBODY>
					</table>
					</div>`
					
					main +=`${xtable}`
							
					aPage.length = 0 //reset array
					
					closeDb(db)

					//console.log( main )
					res.send(main) //output result
				})//endquery
								
			}//eif 
		
		})//==end db.query 
		
	}).catch((error)=>{
		res.status(500).json({error:'No Fetch Docs'})
	})		

})//end pagination


const pdfBatch =  ( emp_id ) =>{
	return new Promise((resolve, reject)=> {
		const sql = `Select sequence from asn_pdf_sequence;`
		let xcode, seq
	
		connectDb()
		.then((db)=>{
			db.query(`${sql}`,(error,results) => {
				if(results.length>0){
					
					seq = results[0].sequence+1
					//console.log(results,seq)
					//console.log( seq.toString().padStart(5,"0") )
					const usql = `update asn_pdf_sequence set sequence = ${seq}`
					
					db.query(`${usql}`,(error,udata) => {
					})
	
					xcode =`ASN-${seq.toString().padStart(5,"0")}`

					
				}
	
				closeDb(db)
				//console.log(xcode)
				resolve( xcode )
				
			})
		}).catch((error)=>{
			reject(error)
			res.status(500).json({error:'Error'})
		})
	})

	
}

router.get('/pdfx', async(req,res)=>{
	
	 let xxx =  await pdfBatch('205214')
	console.log('serial',xxx)
	res.status(200).json({status:'ok'})
})


//======= CHECK PDF FIRST BEFORE CREATING ==============
router.get('/checkpdf/:e_num/:grp_id', async(req, res)=>{

	//console.log(req.params.grp_id)

	if( req.params.grp_id!=="2"){ //if the one checking is not ARE COORDINATOR allow to re-print/download pdf
		const sql = `Select emp_id,pdf_batch from asn_claims
			where emp_id='${req.params.e_num}' 
			order by emp_id`

		connectDb()
		.then((db)=>{
			db.query(`${sql}`,async(error,results) => {	
				if(results.length > 0){
					console.log('OK TO REPRINT')
					
					closeDb(db) //close
					res.status(200).json({status:true, batch:`${results[0].pdf_batch}`})
				}
			})

		}).catch((error)=>{
			res.status(500).json({error:'Error'})
		}) 

	}else{

		const sql = `Select emp_id,pdf_batch from asn_claims
			where emp_id='${req.params.e_num}' and
			pdf_batch <> ''
			order by emp_id`

		connectDb()
		.then((db)=>{
			db.query(`${sql}`,async(error,results) => {	
				if(results.length > 0){
					console.log('FOUND!')
					
					closeDb(db) //close

					res.status(200).json({status:false, batch: results[0].pdf_batch})
				}else{
					const seq = await pdfBatch( req.params.e_num)

					const sql2 = `UPDATE asn_claims SET pdf_batch ='${seq}'
								where emp_id='${req.params.e_num}'`
					
					console.log(sql2)	

					db.query(sql2, null, (error,xdata) => {
						///console.log(xdata) xdata.affectedRows or changedRows
					})

					console.log('UPDATED DATABASE WITH PDFBATCH() GOOD TO DOWNLOAD!')
					
					closeDb(db)
					res.status(200).json({status:true, batch:`${seq}`})
					
				}
			})

		}).catch((error)=>{
			res.status(500).json({error:'Error'})
		}) 

	}//eif
	
	

})

//======= CREATE PDF
router.get('/createpdf/:e_num/:batch', async(req, res)=>{

	console.log('===createpdf()====', req.params.e_num)
	const sql = `SELECT distinct(emp_id) as emp_id,
	full_name as rider,
	category,
	hubs_location as hub, 
	track_number as track,
	claims_reason as reason,
	sum( amount ) as total from asn_claims
	group by full_name,emp_id,category,hubs_location, track_number,claims_reason
	having emp_id='${req.params.e_num}'
	order by full_name`

	//console.log(sql )

	connectDb()
	.then((db)=>{
		db.query(`${sql}`,(error,results) => {	
		
			if ( results.length == 0) {   //data = array 
				console.log('no rec')
				closeDb(db);//CLOSE connection
		
				res.status(500).send('** No Record Yet! ***')
		
			}else{ 
			
				let xdata = []

				xdata = results //get result in array
				const curr_date = strdates()

				let total_amt = 0
				for(let zkey in results){
					
					total_amt+=parseFloat(results[zkey].total)
					results[zkey].total= parseFloat(results[zkey].total).toFixed(2) //change to decimal first
					 
				}//endfor

				let nFormatTotal = addCommas(parseFloat(total_amt).toFixed(2))
				let nTotal = parseFloat(total_amt).toFixed(2)

				//=== CREATE MEDRX ===========
				asnpdf.reportpdf( xdata, curr_date,  nFormatTotal, nTotal, req.params.batch)
				.then( reportfile =>{
					console.log('REPORT PDF SUCCESS!', reportfile)
					
					//============ force download
					res.download( reportfile, reportfile,(err)=>{
						console.log('==downloading pdf===')
						if(err){
							console.error('Error in Downloading ',reportfile,err)

							closeDb(db)

							res.status(500).send(`Error in Downloading ${reportfile}`)
						}else{

							closeDb(db)
							
						}
					}) //===end res.download
				})
			}//eif
		})

	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	}) 
})

//====== CLEANUP PDF
router.get('/deletepdf/:e_num', async(req, res) => {

	let reportfile = `ADT_${req.params.e_num}.pdf`

 	Utils.deletePdf(reportfile)
	.then(x => {
		if(x){
			
			//=== RETURN RESULT ===//
			console.log('*** Deleted temp file ', reportfile)
			
			//update patient record
			//closeDb(db)
			res.status(200).json({status:true})

		}//eif
	})
})//end Utils.deletepdfse{



//============SAVE J&T LINK WHEN SCANNED===//
router.post('/addlink', async(req,res)=>{
	sql = `INSERT INTO asn_jtlink (link) 
		VALUES (?) `
	
	console.log(sql)

	connectDb()
	.then((db)=>{
		db.query( sql,	[req.body.link ],	(error,result)=>{
				console.log('inserting j&T link..',result)

				//results[0]
				res.json({
					message: "Link added Successfully!",
					status:true
				})
	
				closeDb(db);//CLOSE connection
			
		})
	})	
})


router.get('/getzap/:eqptid', async(req,res)=>{
	sql = `DELETE from equipment
	where equipment_id = '${req.params.eqptid}'`

	connectDb()
	.then((db)=>{
	
		db.query(sql, null ,(error,data) => {	
			if ( data.length  == 0) {   //data = array 
				console.log('no rec')
				
				closeDb(db);//CLOSE connection
				//console.log("===MYSQL CONNECTON CLOSED SUCCESSFULLY===")


			}else{

				res.status(200).json({ status : true, voice:'Equipment Deleted Successfully', message:'Equipment Deleted Successfully' })			
			}//eif
			closeDb( db )
		}) //end db.query 
	})//tne .then(db)
	
})


const bcrypt = require("bcrypt")
const saltRounds = 10
//======== END NODEJS CORS SETTING
const getRandomPin = (chars, len)=>[...Array(len)].map(
    (i)=>chars[Math.floor(Math.random()*chars.length)]
).join('');


//==========SEND OTP
router.get( '/sendotp/:email/:name', async (req,res)=>{
	
	const otp = getRandomPin('0123456789',6)
	
	bcrypt
	.hash( otp, saltRounds)
	.then(hash => {

		axios.get(`https://vantaztic.com/vanz/mailotp.php?otp=${otp}&name=${req.params.name}&email=${req.params.email}`)
		.then((response) => {
			if (response.status === 200) {
				const html = response.data;
				//mail the otp
				console.log(`https://vantaztic.com/vanz/mailotp.php?otp=${otp}&name=${req.params.name}&email=${req.params.email}`)
				console.log('axios otp/ ', otp, ' ===Hash== ', hash)
				
				//save the otp to db
				let sqlu = `UPDATE vantaztic_users SET private_key='${hash}'
				WHERE email ='${req.params.email}' `
			
				connectDb()
				.then((db)=>{
			
					db.query(sqlu,(error,results) => {	
						console.log('otp update==', sqlu, results.changedRows)
					})
					
					closeDb(db);//CLOSE connection
			

				}).catch((error)=>{
					res.status(500).json({error:'Error'})
				})
				
				res.json({
					status:true
				})	

				
			}
		})
		.catch((err) => {
			throw new Error(err);
		});
	  	
	})
	.catch(err => console.error(err.message))
	
})
 
//===== GET OTP AND COMPARE
router.get( '/getotp/:otp/:email', async (req,res)=>{
	sql = `select private_key from vantaztic_users where email = '${req.params.email}'`
	connectDb()
	.then((db)=>{

		db.query(sql,null, (err,results) => {	
			
			//console.log('inquire data', data, sql )
			
			if(results.length>0){
				//console.log('inquire data', results )
				
				bcrypt
				.compare( req.params.otp, results[0].private_key)
				.then(xres => {
					console.log('OTP Matched?: ',xres) // return true
					
					res.json({
						status:xres
					})
	
				})
				.catch(err => console.error(err.message))			
			}else{
				res.json({
					status:false
				})

			}
		})
		
		closeDb(db);//CLOSE connection


	}).catch((error)=>{
		res.status(500).json({error:'Error'})
	})

})

 
const smsPost = (msgbody) => {
	//number : '09175761186,09985524618,09611164983',
	console.log('***SENDING SMS*** ', msgbody)
	let smsdata = {
		apikey : '20dc879ad17ec2b41ec0dba928b28a69', //Your API KEY
		number : '09611164983',			
		message : msgbody,
		sendername : 'SEMAPHORE'
    }
	
	fetcher('https://semaphore.co/api/v4/messages', {
		method: 'POST',
		body: JSON.stringify(smsdata),
		headers: { 'Content-Type': 'application/json' }
	})   
	.then(res => res.json() )
    .then(json => console.log ('sms ->', json ))
	
}

//========add comma for currency
const addCommas = (nStr) => {
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}


const getDate = () =>{
	let today = new Date()
	var dd = String(today.getDate()).padStart(2,'0')
	var mm = String(today.getMonth()+1).padStart(2,'0')
	var yyyy = today.getFullYear()

	today = mm +'/'+dd+'/'+yyyy
	return today
} 

const nugetDate = () =>{
	let today = new Date()
	var dd = String(today.getDate()).padStart(2,'0')
	var mm = String(today.getMonth()+1).padStart(2,'0')
	var yyyy = today.getFullYear()

	today =yyyy+'-'+mm +'-'+dd

	return today
}

const strdates = () =>{
	let today = new Date()
	var dd = String(today.getDate()).padStart(2,'0')
	var mm = String(today.getMonth()+1).padStart(2,'0')
	var yyyy = today.getFullYear()
	var mos = new Date(`${today.getMonth()+1}/${dd}/${yyyy}`).toLocaleString('en-PH',{month:'long'})

	today = mos + ' '+ dd +', '+yyyy
	return today
}


//======sample pagination
//=====https://localhost:3000/q/6/2 
router.get('/q/:limit/:page',  async(req,res) => {
	
	const limit_num = req.params.limit
	let nStart = 0
	let page = req.params.page
	
	connectDb()
	.then((db)=>{
		
		sql1 = `select * from equipment_client`
							
		db.query(sql1,null,(err,data)=>{
			
			if(data.length==0){
			}else{
				//==== for next
				let aPage = []
				let pages = Math.ceil( data.length / limit_num )
				
				nStart = 0
				
				for (let i = 0; i < pages; i++) {
					aPage.push(nStart)
					nStart += parseInt(limit_num)
				}//==next
				
				console.log('offset ',aPage)
				sql2 = `select * from equipment_client 
						LIMIT ${limit_num} OFFSET ${aPage[page-1]}`
				console.log(sql2)
				
				db.query(`select * from equipment_client 
						LIMIT ${limit_num} OFFSET ${aPage[page-1]}`,null,(err,data)=>{
					
					let mytable = `
							<table class="table p-3 table-striped table-hover">
							<thead>
								<tr>
								  <th scope="col">ID</th>
								  <th scope="col">PO</th>
								  <th scope="col">TRANSACTION</th>
								</tr>
							</thead>
							<tbody>`
							
					for (let ikey in data){
						mytable += `<tr>
							<td>${data[ikey].id}</td>
							<td>${data[ikey].po_number }</td>
							<td>${data[ikey].transaction }</td>
						</tr>`
					}//=======end for
					
					let xprev = ((page-1)>0?'':'disabled')
					let xnext = ((page>=pages)?'disabled':'')
					let mypagination = "", main = "", xclass = ""
					//===mypagination is for pagination
					
					//===final pagination
					mypagination+=`
					<nav aria-label="Page navigation example">
					  <ul class="pagination">`
					
					//$xprev
					mypagination += `<li class="page-item ${xprev}"><a class="page-link" href="${parseInt(req.params.page)-1 }">Previous</a></li>`
					
					for(let x=0; x < pages; x++){
						if(req.params.page==(x+1)){
							xclass = " active"
						}else{
							xclass = ""
						}
						mypagination += `<li class="page-item"><a class="page-link ${xclass}" href="${x+1}">${x+1}</a></li>`
					}//end for
					
					mypagination += `<li class="page-item ${xnext}"><a class="page-link" href="${parseInt(req.params.page)+1}">Next</a></li>`
					
					mypagination+=`
					</ul>
					</nav>`
					
					mytable += `
						<tr>
						<td colspan=3 align='center'>
						 ${mypagination}
						</td>
						</tr>
						</TBODY>
					</table>`
					
					main +=`
					<!doctype html>
					<html lang="en">
					  <head>
						<meta charset="utf-8">
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<title>Bootstrap demo</title>
						<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN" crossorigin="anonymous">
					  </head>
					  <body>
						${mytable}
						<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL" crossorigin="anonymous"></script>
					  </body>
					</html>`
							
					aPage.length = 0 //reset array
					res.send(main) //output result
				})//endquery
				
			}//eif 
		
		})//==end db.query 
		
	}).catch((error)=>{
		res.status(500).json({error:'No Fetch Docs'})
	})		

	
})

router.get('/handshake', async(req,res) => {

	res.json({status:true})
})

	return router;
}
//module.exports = router