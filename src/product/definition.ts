import { validateAuthorization as validate0 } from '../berth-window/policy'
import { validateAuthorization as validate1 } from '../vessel-clearance/policy'
import { validateAuthorization as validate2 } from '../crane-plan/policy'
import { validateAuthorization as validate3 } from '../container-hold/policy'
import { validateAuthorization as validate4 } from '../reefer-monitoring/policy'
import { validateAuthorization as validate5 } from '../yard-stack/policy'
import { validateAuthorization as validate6 } from '../gate-sequence/policy'
import { validateAuthorization as validate7 } from '../dangerous-goods/policy'
import type { Entity, Field, Operation, Product } from '../workspace/types'
import { entity, number, requireThat, text } from '../workspace/values'
const roles=["Terminal Planner","Harbor Master","Yard Supervisor","Customs Compliance Lead"] as const
const textField=(key:string,label:string):Field=>({key,label,type:'text',required:true,initial:'Evidence pending'})
const numberField=(key:string,label:string,initial:number):Field=>({key,label,type:'number',required:true,integer:true,min:0,max:1000000000,initial})
const dateField=(key:string,label:string):Field=>({key,label,type:'date',required:true,initial:'2026-09-14'})
type Validator=(record:{measured:number;limit:number;evidence:string;revision:number})=>unknown
function workflowOperations(kind:string,label:string,validate:Validator):Operation[]{return[
  {key:kind+'-submit',label:'Submit '+label,kind,from:['draft'],roles:[roles[0]],run:({entity})=>{entity.status='review';return label+' submitted for independent review.'}},
  {key:kind+'-authorize',label:'Authorize '+label,kind,from:['review'],roles:[roles[1]],run:({entity})=>{validate({measured:number(entity.fields,'measured'),limit:number(entity.fields,'limit'),evidence:text(entity.fields,'evidence'),revision:entity.revision});entity.status='authorized';return label+' authorized against current evidence and limits.'}},
  {key:kind+'-execute',label:'Execute '+label,kind,from:['authorized'],roles:[roles[2]],run:({entity,now})=>{requireThat(text(entity.fields,'effectiveDate')<=now.slice(0,10),'The effective date has not arrived.');entity.status='active';return label+' executed with operational custody recorded.'}},
  {key:kind+'-block',label:'Block '+label,kind,from:['authorized','active'],roles:[roles[0],roles[2]],fields:[textField('reason','Blocking reason')],run:({entity,input})=>{requireThat(text(input,'reason').trim().length>=8,'A specific blocking reason is required.');entity.status='blocked';return label+' blocked without losing prior evidence.'}},
  {key:kind+'-recover',label:'Recover '+label,kind,from:['blocked'],roles:[roles[1]],fields:[textField('recovery','Recovery evidence')],run:({entity,input})=>{requireThat(text(input,'recovery').trim().length>=8,'Recovery evidence is required.');entity.status='review';return label+' returned to review with recovery evidence.'}},
  {key:kind+'-close',label:'Close '+label,kind,from:['active'],roles:[roles[3]],run:({entity})=>{entity.status='closed';return label+' closed by accountable authority.'}},
]}
const kinds=[{
    key:"berth-window", label:"Berth window allocation", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Departure tide slot",6), numberField('limit',"Latest berth release slot",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"vessel-clearance", label:"Vessel arrival clearance", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Clearance score",4), numberField('limit',"Minimum clearance score",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"crane-plan", label:"Quay crane capacity", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Required crane hours",6), numberField('limit',"Available crane hours",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"container-hold", label:"Container customs holds", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Manifest revision",4), numberField('limit',"Cleared manifest revision",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"reefer-monitoring", label:"Reefer telemetry monitoring", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Sensor age (minutes)",6), numberField('limit',"Maximum sensor age",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"yard-stack", label:"Yard stack limits", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Stack height",4), numberField('limit',"Maximum stack height",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"gate-sequence", label:"Truck gate sequence", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Completed gate step",6), numberField('limit',"Required gate step",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"dangerous-goods", label:"Dangerous goods segregation", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Separation distance meters",4), numberField('limit',"Minimum separation distance",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  }]
const operations:Operation[]=[...workflowOperations("berth-window", "Berth window allocation", validate0),
...workflowOperations("vessel-clearance", "Vessel arrival clearance", validate1),
...workflowOperations("crane-plan", "Quay crane capacity", validate2),
...workflowOperations("container-hold", "Container customs holds", validate3),
...workflowOperations("reefer-monitoring", "Reefer telemetry monitoring", validate4),
...workflowOperations("yard-stack", "Yard stack limits", validate5),
...workflowOperations("gate-sequence", "Truck gate sequence", validate6),
...workflowOperations("dangerous-goods", "Dangerous goods segregation", validate7)]
const seed:Entity[]=[entity("berth-window-001","berth-window","Berth window allocation primary record",'review',{owner:"Terminal Planner",measured:4,limit:8,evidence:"EV-PORTFLOW-001",effectiveDate:'2026-09-14'}),
entity("berth-window-002","berth-window","Berth window allocation recovery record",'blocked',{owner:"Yard Supervisor",measured:4,limit:8,evidence:"REC-PORTFLOW-001",effectiveDate:'2026-09-15'}),
entity("vessel-clearance-001","vessel-clearance","Vessel arrival clearance primary record",'review',{owner:"Terminal Planner",measured:8,limit:5,evidence:"EV-PORTFLOW-002",effectiveDate:'2026-09-14'}),
entity("vessel-clearance-002","vessel-clearance","Vessel arrival clearance recovery record",'blocked',{owner:"Yard Supervisor",measured:8,limit:5,evidence:"REC-PORTFLOW-002",effectiveDate:'2026-09-15'}),
entity("crane-plan-001","crane-plan","Quay crane capacity primary record",'review',{owner:"Terminal Planner",measured:4,limit:8,evidence:"EV-PORTFLOW-003",effectiveDate:'2026-09-14'}),
entity("crane-plan-002","crane-plan","Quay crane capacity recovery record",'blocked',{owner:"Yard Supervisor",measured:4,limit:8,evidence:"REC-PORTFLOW-003",effectiveDate:'2026-09-15'}),
entity("container-hold-001","container-hold","Container customs holds primary record",'review',{owner:"Terminal Planner",measured:5,limit:5,evidence:"EV-PORTFLOW-004",effectiveDate:'2026-09-14'}),
entity("container-hold-002","container-hold","Container customs holds recovery record",'blocked',{owner:"Yard Supervisor",measured:5,limit:5,evidence:"REC-PORTFLOW-004",effectiveDate:'2026-09-15'}),
entity("reefer-monitoring-001","reefer-monitoring","Reefer telemetry monitoring primary record",'review',{owner:"Terminal Planner",measured:4,limit:8,evidence:"EV-PORTFLOW-005",effectiveDate:'2026-09-14'}),
entity("reefer-monitoring-002","reefer-monitoring","Reefer telemetry monitoring recovery record",'blocked',{owner:"Yard Supervisor",measured:4,limit:8,evidence:"REC-PORTFLOW-005",effectiveDate:'2026-09-15'}),
entity("yard-stack-001","yard-stack","Yard stack limits primary record",'review',{owner:"Terminal Planner",measured:4,limit:8,evidence:"EV-PORTFLOW-006",effectiveDate:'2026-09-14'}),
entity("yard-stack-002","yard-stack","Yard stack limits recovery record",'blocked',{owner:"Yard Supervisor",measured:4,limit:8,evidence:"REC-PORTFLOW-006",effectiveDate:'2026-09-15'}),
entity("gate-sequence-001","gate-sequence","Truck gate sequence primary record",'review',{owner:"Terminal Planner",measured:8,limit:5,evidence:"EV-PORTFLOW-007",effectiveDate:'2026-09-14'}),
entity("gate-sequence-002","gate-sequence","Truck gate sequence recovery record",'blocked',{owner:"Yard Supervisor",measured:8,limit:5,evidence:"REC-PORTFLOW-007",effectiveDate:'2026-09-15'}),
entity("dangerous-goods-001","dangerous-goods","Dangerous goods segregation primary record",'review',{owner:"Terminal Planner",measured:8,limit:5,evidence:"EV-PORTFLOW-008",effectiveDate:'2026-09-14'}),
entity("dangerous-goods-002","dangerous-goods","Dangerous goods segregation recovery record",'blocked',{owner:"Yard Supervisor",measured:8,limit:5,evidence:"REC-PORTFLOW-008",effectiveDate:'2026-09-15'})]
export const product:Product={name:"PortFlow",description:"Maritime port and container terminal operations",accent:"#1261A0",actors:roles.map((role,index)=>({id:'actor-'+String(index),name:role,role})),kinds,operations,seed,
 validate:(entities)=>{for(const row of entities){requireThat(kinds.some(kind=>kind.key===row.kind),'Unknown domain record.');requireThat(typeof row.fields['owner']==='string','Every workflow requires accountable ownership.')}},
 metrics:(entities)=>[{label:'Domain records',value:String(entities.length)},{label:'Active controls',value:String(entities.filter(row=>['review','authorized','active','blocked'].includes(row.status)).length)},{label:'Blocked',value:String(entities.filter(row=>row.status==='blocked').length)},{label:'Closed',value:String(entities.filter(row=>row.status==='closed').length)}]}
