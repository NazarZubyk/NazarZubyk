import { Request, Response } from 'express';
import { IUserDocument, Task } from './types';
import { addNewUserToBD } from './mongoDBfunctions';
import { validationResult } from 'express-validator';

const User = require('./user')

declare module 'express-session' {
    interface SessionData {
      user?: string;
      tasks?: [Task] ;
      uniqueCaunt: number;
    }
  }


export async function getItems (req: Request, res: Response){
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json( { "error": "bad request" } ); 
        }

        if(req.session.user === undefined){

            if (!req.session.tasks) {
                req.session.tasks = [] as unknown as [Task];
            }

            if (!req.session.uniqueCaunt) {
                req.session.uniqueCaunt = 1;
            }

            
            let resJson = JSON.stringify({items:req.session.tasks})
            res.send( resJson ) 
        }
        else{        
            const user = await User.findOne({login: req.session.user}).exec();

            if(user){
                const resJson = {items: user.tasks}
                res.send(resJson)
            }
            else{
                res.status(404).json({"error": `cannot finde ${req.session.user} in datdbase`})
            }        
        }       
    } catch (error) {
        res.status(500).json({ "error": "fatal server error in get-'/api/v1/items'" } )
    }
}

export async function addItems(req:Request, res: Response) {
    try {       
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json( { "error": "bad request" } ); 
        }

        if(req.session.user === undefined){
            const bodyReq:{text:string} = req.body;
    
            if (!req.session.tasks) {
                req.session.tasks = [] as unknown as [Task];
            }
    
            if (!req.session.uniqueCaunt) {
                req.session.uniqueCaunt = 1;
            }
    
            const newTask: Task = {
                id: req.session.uniqueCaunt,
                text : bodyReq.text,
                checked : false
            } 
    
            req.session.tasks.push(newTask);
            req.session.uniqueCaunt++;
    
            const resJson = JSON.stringify({id:newTask.id})
            res.send(resJson)
    
            console.log(`adds new task with id:${newTask.id}`)
        }
        else{
            const user = await User.findOne({login: req.session.user}).exec();
    
            if (!user.lastUniqueCount) {
                user.lastUniqueCount = 1;
            }
    
            const bodyReq:{text:string} = req.body;
            const newTask: Task = {
                id: user.lastUniqueCount,
                text : bodyReq.text,
                checked : false
            } 
            
            if(user){
                user.tasks.push(newTask)
                user.lastUniqueCount++
                await user.save();
                const resJson = JSON.stringify({id:newTask.id})
                res.send(resJson)
            }
            else{
                res.status(404).json({error: "cannot found user"})
            }
    
        }    
    } catch (error) {
        res.status(500).json({ "error": "fatal server error in post'/api/v1/items'" } )
    }
    
}

export async function editItems(req: Request, res: Response) {
    try {      
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json( { "error": "bad request" } ); 
        }

        const reqBody = req.body;
    
        if(req.session.user === undefined){
            const indexForUpdate = req.session.tasks?.findIndex(task=> task.id === reqBody.id) 
    
            if(indexForUpdate !== -1  && req.session.tasks !== undefined && indexForUpdate !== undefined){
                req.session.tasks[indexForUpdate] = reqBody;
                res.send({ "ok" : true })
            }
            else{
                res.status(404)
            }
            console.log('put')
        }
        else{
            const user:IUserDocument = await User.findOne({login: req.session.user}).exec();
    
            if(user){
                const indexForUpdate = user.tasks.findIndex(task=> task.id === reqBody.id);
                user.tasks[indexForUpdate] = reqBody;
                await user.save();
                res.send({ "ok" : true })
            }
            else{
                res.status(404)
            }
            
        }
        
    } catch (error) {
        res.status(500).json({ "error": "fatal server error in put('/api/v1/items'" } )
    }
}

export async function deleteItem(req: Request, res: Response) {

try {    
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json( { "error": "bad request" } ); 
        }

    const reqBody = req.body;
    if(req.session.user === undefined){
        
        const indexForUpdate = req.session.tasks?.findIndex(task=> task.id === reqBody.id) 

        if(indexForUpdate !== -1  && req.session.tasks !== undefined && indexForUpdate !== undefined){
            req.session.tasks.splice(indexForUpdate,1);
            res.send({ "ok" : true })
        }
        else{
            res.status(404)
        }
        console.log('deleted')
    }
    else{
        const user:IUserDocument = await User.findOne({login: req.session.user}).exec();

        const indexForUpdate = user.tasks.findIndex(task=> task.id === reqBody.id) 
        console.log("index - " + indexForUpdate)
        if(indexForUpdate !== -1   && indexForUpdate !== undefined){
            console.log("list - " + user.tasks);
            user.tasks.splice(indexForUpdate,1);
            console.log("list after - " + user.tasks);
            await user.save();
            res.send({ "ok" : true })
        }
        else{
            res.status(404)
        }      
    }
} catch (error) {
    res.status(500).json({ "error": "fatal server error in delete('/api/v1/items'" } )
}
    
}

export async function toLogin(req: Request, res: Response) {

try {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json( { "error": "bad request" } ); 
        }
       
    const login = req.body?.login;
    const password = req.body?.pass;

    const user:[IUserDocument] = await User.find({login:login})
    
    if(!user){
        return res.status(401).json({ message: 'Invalid login credentials' });
    }
    
    if(password === user[0].password){
        req.session.user = user[0].login;
        res.send({"ok":true})   
    }
    else{
        console.log("password was not true")

    }
} catch (error) {
    res.status(500).json({ "error": "fatal server error in post('/api/v1/login'" } )
}
    
}

export async function toRegister(req: Request, res: Response) {
    try {  
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json( { "error": "bad request" } ); 
        }

        const login = req.body?.login;
        const password = req.body?.pass;
    
        const tasks = [] as unknown as [Task]   
    
        addNewUserToBD(login,password,tasks)
    
        res.send({"ok":true})   
    
    } catch (error) {
        res.status(500).json({ "error": "fatal server error in post('/api/v1/register'" } )  
    }
    
}

export async function toLogout(req: Request, res:Response) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json( { "error": "bad request" } ); 
        }

        req.session.destroy((err)=>{
            console.log(err)
        })
        res.send({'ok':true})
    } catch (error) {
        res.status(500).json({ "error": "fatal server error in post('/api/v1/logout'" } )  
    }    
}