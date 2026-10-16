import {query,statement} from '@/db';
import {TOWN_PROJECTS,type TownProjectState} from '@/domain/town-projects';

export async function readTownProjects():Promise<TownProjectState[]>{
 const rows=await query<TownProjectState>(`SELECT p.id,p.stage,p.revision,p.completed_at AS completedAt,
  COUNT(w.receipt) AS contributions,COUNT(DISTINCT w.profile_id) AS neighbors FROM town_projects p
  LEFT JOIN town_project_work w ON w.project_id=p.id AND w.stage=p.stage GROUP BY p.id`);
 return TOWN_PROJECTS.map(p=>rows.find(r=>r.id===p.id)??{id:p.id,stage:0,revision:0,completedAt:0,contributions:0,neighbors:0});
}
/** Called inside the same transaction as an already guarded completion receipt. */
export function civicContribution(receipt:string,activity:string,now:number){
 const steps:D1PreparedStatement[]=[];
 for(const project of TOWN_PROJECTS){
  if(!project.stages.some(s=>s.activity===activity))continue;
  steps.push(statement(`INSERT OR IGNORE INTO town_projects(id,updated_at) SELECT ?,? WHERE EXISTS(SELECT 1 FROM town_contributions WHERE id=?)`,project.id,now,receipt));
  project.stages.forEach((stage,index)=>{
   if(stage.activity!==activity)return;
   steps.push(statement(`INSERT OR IGNORE INTO town_project_work(project_id,stage,receipt,profile_id,created_at)
    SELECT p.id,p.stage,c.id,c.profile_id,? FROM town_projects p JOIN town_contributions c ON c.id=?
    WHERE p.id=? AND p.stage=? AND c.activity_id=?`,now,receipt,project.id,index,activity));
   steps.push(statement(`UPDATE town_projects SET stage=stage+1,revision=revision+1,updated_at=?,completed_at=?
    WHERE id=? AND stage=? AND (SELECT COUNT(*) FROM town_project_work WHERE project_id=? AND stage=?)>=?
    AND (SELECT COUNT(DISTINCT profile_id) FROM town_project_work WHERE project_id=? AND stage=?)>=2`,
    now,index===project.stages.length-1?now:0,project.id,index,project.id,index,stage.goal,project.id,index));
  });
 }
 return steps;
}
