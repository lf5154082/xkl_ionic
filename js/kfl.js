//创建模块
var app = angular.module('myApp', ['ionic']);
app.factory('$debounce', ['$rootScope', '$browser', '$q', '$exceptionHandler',
    function($rootScope, $browser, $q, $exceptionHandler) {
        var deferreds = {},
            methods = {},
            uuid = 0;

        function debounce(fn, delay, invokeApply) {
            var deferred = $q.defer(),
                promise = deferred.promise,
                skipApply = (angular.isDefined(invokeApply) && !invokeApply),
                timeoutId, cleanup,
                methodId, bouncing = false;

            // check we dont have this method already registered
            angular.forEach(methods, function(value, key) {
                if (angular.equals(methods[key].fn, fn)) {
                    bouncing = true;
                    methodId = key;
                }
            });

            // not bouncing, then register new instance
            if (!bouncing) {
                methodId = uuid++;
                methods[methodId] = { fn: fn };
            } else {
                // clear the old timeout
                deferreds[methods[methodId].timeoutId].reject('bounced');
                $browser.defer.cancel(methods[methodId].timeoutId);
            }

            var debounced = function() {
                // actually executing? clean method bank
                delete methods[methodId];

                try {
                    deferred.resolve(fn());
                } catch (e) {
                    deferred.reject(e);
                    $exceptionHandler(e);
                }

                if (!skipApply) $rootScope.$apply();
            };

            timeoutId = $browser.defer(debounced, delay);

            // track id with method
            methods[methodId].timeoutId = timeoutId;

            cleanup = function(reason) {
                delete deferreds[promise.$$timeoutId];
            };

            promise.$$timeoutId = timeoutId;
            deferreds[timeoutId] = deferred;
            promise.then(cleanup, cleanup);

            return promise;
        }


        // similar to angular's $timeout cancel
        debounce.cancel = function(promise) {
            if (promise && promise.$$timeoutId in deferreds) {
                deferreds[promise.$$timeoutId].reject('canceled');
                return $browser.defer.cancel(promise.$$timeoutId);
            }
            return false;
        };

        return debounce;
    }
]);
//配置路由词典
app.config(function($stateProvider,$urlRouterProvider,$ionicConfigProvider){
    $stateProvider
        .state('start',{
            url:'/kflStart',
            templateUrl:'tpl/start.html'

        })
        .state('main',{
            url:'/kflMain',
            templateUrl:'tpl/main.html',
            controller:'mainCtrl'
        })
        .state('detail',{
            url:'/kflDetail/:did',
            templateUrl:'tpl/detail.html',
            controller:'detailCtrl'
        })
        .state('order',{
            url:'/kflOrder/:detail',
            templateUrl:'tpl/order.html',
            controller:'orderCtrl'
        })
        .state('set',{
            url:'/kflSet',
            templateUrl:'tpl/set.html',
            controller:'setCtrl'

        })
        .state('car',{
            url:'/kflCar',
            templateUrl:'tpl/car.html',
            controller:'carCtrl'
        })
        .state('myOrder',{
            url:'/kflMyOrder',
            templateUrl:'tpl/myorder.html',
            controller:'myOrderCtrl'
        });
    $urlRouterProvider.otherwise('/kflStart');
    $ionicConfigProvider.tabs.position('bottom');

});
app.controller('parentCtrl',['$scope','$state',function($scope,$state){
    $scope.jump=function(desState,params){
        $state.go(desState,params)
    }
}]);
app.controller('mainCtrl',['$scope','$http','$debounce',function($scope,$http,$debounce){
    $scope.hasMore=true;//数据是否有更多要加载
    $scope.dishList=[];
    //  加载到代码片段，进到控制器处理函数中，发起请求拿数据
    $http
        .get('data/dish_getbypage.php?start=0')
        .success(function(data){
            $scope.dishList=data;
        });
    //监听用户的输入
    $scope.inputTxt={kw:''};
    $scope.$watch('inputTxt.kw',function(){

        //放抖动处理
        $debounce(watchHandler,300);
    });
    watchHandler=function(){
        console.log($scope.inputTxt.kw);
        if($scope.inputTxt.kw){
            $http
                .get('data/dish_getbykw.php?kw='+$scope.inputTxt.kw)
                .success(function(data){
                    console.log(data);
                    //搜索是由结果的
                    if(data.length>0){
                        //将搜索到的结果显示在main页面的列表上
                        $scope.dishList=data;
                    }

                })
        }
    };
    //加载更多
    $scope.loadMore=function(){
        $http
            .get('data/dish_getbypage.php?start='+$scope.dishList.length)
            .success(function(data){
                if (data.length < 5){
                    //没有更多数据：将按钮隐藏掉，显示一个提示信息
                    $scope.hasMore = false;
                }
                $scope.dishList=$scope.dishList.concat(data);
                $scope.$broadcast('scroll.infiniteScrollComplete');
            })
    }

}]);
app.controller('detailCtrl',['$scope','$stateParams','$http','$ionicPopup', function($scope,$stateParams,$http,$ionicPopup){
    $scope.did=$stateParams.did;
    console.log($scope.did);
    $http
        .get('data/dish_getbyid.php?id='+$scope.did)
        .success(function(data){
            console.log(data);
            $scope.dish=data[0];
        });
    $scope.addToCart=function(){
        $http
            .get('data/cart_update.php?uid=1&did='+$scope.did+"&count=-1")
            .success(function(data){
                console.log(data);
                if(data.msg=='succ'){
                    $ionicPopup.alert({template:"添加成功"})
                }else{
                    $ionicPopup.alert({template:"添加失败"})
                }
            })
    }
}]);
app.controller('orderCtrl',['$scope','$stateParams','$http','$httpParamSerializerJQLike',function($scope,$stateParams,$http,$httpParamSerializerJQLike){
    $scope.order={did:$stateParams.detail};
    //反序列化：json格式的字符串 对象或者数组
    var cartList=angular.fromJson($stateParams.detail);
    console.log(cartList);
    var totalPrice=0;
    angular.forEach(cartList,function(value,key){
        console.log(value);
        totalPrice+=(value.dishCount*value.price);
    });
    $scope.order={
        totalprice:totalPrice,
        cartDetail:$stateParams.detail,
        userid:1,
        did:$stateParams.did,
        user_name:'',
        sex:1,
        addr:'',
        phone:''

    };

    $scope.submitOrder=function(){
        //先去获取用户输入的各个信息
        console.log($scope.order);
        //将输入的信息 发送 给服务器端
        var params=$httpParamSerializerJQLike($scope.order);
        console.log(params);
        $http
            .get('data/order_add.php?'+params)
            .success(function(data){
                //解析服务端返回的结果
                console.log(data);
                if(data.length>0){
                    if(data[0].msg=='succ'){
                        $scope.result="下单成功，订单编号为"+data[0].oid;
                        //方案1
                        sessionStorage.setItem('phone',$scope.order.phone)
                    }else{
                        $scope.result="下单失败！";
                    }
                }
            })
    }
}]);
app.controller('myOrderCtrl', ['$scope', '$http',
    function ($scope, $http) {
        var phone = sessionStorage.getItem('phone');
        console.log(phone);
        $http
            .get('data/order_getbyuserid.php?userid=1')
            .success(function (result) {
                console.log(result);
                $scope.orderList = result.data;
            })
    }
]);
app.controller('setCtrl',['$scope','$ionicModal',function($scope,$ionicModal){
    //先去完成$ionicModal的实例化
    $scope.customModal=$ionicModal
        .fromTemplateUrl('tpl/about.html',{scope:$scope})
        .then(function(modal){
            $scope.customModal=modal;
        }

    );
    //定义打开或者关闭的方法
    $scope.showCustomWindow=function(){
        $scope.customModal.show();
    };
    //关闭模态框
    $scope.hide=function(){
        $scope.customModal.hide();
    };

}]);
app.controller('carCtrl',['$scope','$http',function($scope,$http){
    $scope.flagEdit=false;
    $scope.showMsg='编辑';
    $scope.dishList = [];
    $http
        .get('data/cart_select.php?uid=1')
        .success(
            function(result){
                $scope.dishList=result.data;
                console.log($scope.dishList);
        }

    );
    $scope.sumAll=function(){
        var totalPrice=0;
        for (var i = 0; i < $scope.dishList.length; i++) {
            var obj = $scope.dishList[i];
            totalPrice += (obj.price * obj.dishCount);
        }
        return totalPrice;
    };
    $scope.funcEdit=function(){
        $scope.flagEdit=!$scope.flagEdit;
        if($scope.flagEdit){
            $scope.showMsg='完成';
        }else {
            $scope.showMsg='编辑';
        }
    };
    //封装方法更新服务器端购物车中产品数量
    var updateCart=function(did,count){
        $http
            .get('data/cart_update.php?uid=1&did='+did+'&count='+count)
            .success(function(result){
                console.log(result)
            })
    };

    //点击了购物车的减号
    $scope.minus=function(index){
        if($scope.dishList[index].dishCount==1){
            return
        }
            $scope.dishList[index].dishCount--;
        updateCart($scope.dishList[index].did,
            $scope.dishList[index].dishCount)
    };
    //点击了购物车的加号
    $scope.add=function(index){
        $scope.dishList[index].dishCount++;
        updateCart($scope.dishList[index].did,
            $scope.dishList[index].dishCount)
    };
    //json的序列化以及传参数
    $scope.send=function(){
        //序列化
        var result =angular.toJson($scope.dishList);
        //跳转到表单提交页
        $scope.jump('order',{detail:result});
    }

}]);
