# Additional humanoid movement clips

`/plaza/characters/humanoid-extra-motions.glb` contains nine skeleton-only clips extracted from Quaternius Universal Animation Library 1 Standard, CC0 1.0. The original downloaded Standard package's License.txt explicitly identifies CC0 and Quaternius. Source: https://quaternius.com/packs/universalanimationlibrary.html . No Pro or paid clips were used.

Source file: `Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb` (in-place animation version).

| Export clip | Original clip |
|---|---|
| CrouchWalk | Crouch_Fwd_Loop |
| CrouchIdle | Crouch_Idle_Loop |
| Build | Fixing_Kneeling |
| Talk | Idle_Talking_Loop |
| PickUp | PickUp_Table |
| Push | Push_Loop |
| StandUp | Sitting_Exit |
| SeatedTalk | Sitting_Talking_Loop |
| Sprint | Sprint_Loop |

Extraction preserves the source nodes/rest transforms and animation channels; mannequin meshes/textures removed. These clips use the same rig as `humanoid-motions.glb` and the existing rest-space retargeter. Clip availability alone does not provide gameplay mechanics. These additional clips have not undergone the full controller state-machine or multiplayer integration tests; do not claim those interactions work until their handlers are wired.
