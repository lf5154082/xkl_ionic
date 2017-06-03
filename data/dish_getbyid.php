<?php
header("Content-Type:application/json;charset=utf-8");
$id=$_REQUEST['id'];
if(empty($id)){
    echo '[]';
    return;
}
require("init.php");
$sql="SELECT did,name,img_lg,material,detail FROM kf_dish WHERE did=$id";
$result=mysqli_query($conn,$sql);
$row=mysqli_fetch_assoc($result);
$output=[];
$output[]=$row;
if(!$row){
    echo '[]';
    }
    else{
    echo json_encode($output);
    }

?>