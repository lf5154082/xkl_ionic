<?php
header("Content-Type:application/json;charset=utf-8");
$phone=$_REQUEST['phone'];
if(empty($phone)){
    echo '[]';
    return;
}
require("init.php");
$sql="SELECT kf_order.oid,kf_order.user_name,kf_order.order_time,kf_order.addr,kf_dish.img_sm FROM kf_order,kf_dish WHERE phone=$phone AND kf_order.did=kf_dish.did";
$result=mysqli_query($conn,$sql);
$output=[];
while(true){
    $rows=mysqli_fetch_assoc($result);
    if(!$rows){
    break;
    }
    $output[]=$rows;
}
echo json_encode($output);
?>
