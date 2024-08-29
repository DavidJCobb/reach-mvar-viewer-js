
class ReachTeam {
   constructor(info) {
      this.name        = info.name;
      this.color       = info.color;
      this.forge_color = info.forge_color || info.color;
   }
};

const REACH_TEAMS = Object.freeze([
   new ReachTeam({
      name:  "Red",
      color: "#D72D2D",
      forge_color: "#BC3B3B",
   }),
   new ReachTeam({
      name:  "Blue",
      color: "#3975CC",
      forge_color: "#5580C0",
   }),
   new ReachTeam({
      name:  "Green",
      color: "#41A641",
      forge_color: "#7D9947",
   }),
   new ReachTeam({
      name:  "Orange",
      color: "#D8881F",
      forge_color: "#ED9F3B",
   }),
   new ReachTeam({
      name:  "Purple",
      color: "#A553C0",
      forge_color: "#7E62C4",
   }),
   new ReachTeam({
      name:  "Yellow",
      color: "#FFDD00",
      forge_color: "#D8F05C",
   }),
   new ReachTeam({
      name:  "Brown",
      color: "#A17857",
      forge_color: "#B6AA5C",
   }),
   new ReachTeam({
      name:  "Pink",
      color: "#FFBCE3",
      forge_color: "#F3CED6",
   }),
   new ReachTeam({
      name:  "Neutral",
      color: "#EEEEEE",
   }),
]);