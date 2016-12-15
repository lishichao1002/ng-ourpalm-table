(function (angular) {

    angular
        .module('ourpalm-table', [])

        .provider('ourpalmTable', function () {
            var options = {
                column: {
                    header: '',
                    field: '',
                    sort: false, //定义是否排序
                    sortOrder: 'asc', //定义列的排序顺序，只能是'asc'或'desc'
                    checkbox: false, //定义该列是否是checkbox
                    rownumbers: false, //如果为true，则显示一个行号列
                    hide: false //定义是否隐藏列
                },
                serverSort: true, //是否是服务器端排序
                pagination: true, //如果为true，则在控件底部显示分页工具栏
                singleSelect: false, //如果为true，则只允许选择一行
                pageList: [10, 20, 30, 40, 50], //在设置分页属性的时候 初始化页面大小选择列表
                defaultPageSize: 10 //默认的分页大小
            };

            this.setOptions = function (opts) {
                angular.extend(options, opts, true);
            };

            this.$get = function () {
                return {
                    options: options
                }
            }
        })

        /**
         * 表格
         * <table ourpalm-table="vm.loadData(params, callback);" options="{ 'pagination': true, 'singleSelect': true, 'pagePosition': 'bottom', 'pageList': [10, 30, 50, 100], 'defaultPageSize': 30 }"></table>
         * <table ourpalm-table="vm.loadData(params, callback);" pagination="true" single-select="false" page-position="bottom" page-list="[10, 30, 50, 100]" default-page-size="30"></table>
         */
        .directive('ourpalmTable', function ($parse, ourpalmTable, $compile, $timeout) {
            var columns = [];

            return {
                restrict: 'AE',
                priority: 1001,
                scope: true,
                compile: function ($element, $attrs) {
                    var getColumns = function (thead) {
                        var columns = [];
                        $(thead).find('td[table-column]').each(function (index) {
                            var $td = $(this);
                            //read from td element
                            var tableColumn = $td.attr('table-column');
                            var header = $td.attr('header');
                            var field = $td.attr('field');
                            var sort = $td.attr('sort');
                            var checkbox = $td.attr('checkbox');
                            var sortOrder = $td.attr('sort-order');
                            var rownumbers = $td.attr('rownumbers');
                            var hide = $td.attr('hide');

                            //convert data type
                            tableColumn = tableColumn ? JSON.parse(tableColumn) : {};
                            sort = sort === 'true' ? true : false;
                            checkbox = checkbox === 'true' ? true : false;
                            rownumbers = rownumbers === 'true' ? true : false;
                            hide = hide === 'true' ? true : false;

                            //build value
                            var target = {}, userColumn = {}, defaultColumn = ourpalmTable.options.column;
                            angular.extend(userColumn, tableColumn, {
                                header: header,
                                field: field,
                                sort: sort,
                                checkbox: checkbox,
                                sortOrder: sortOrder,
                                rownumbers: rownumbers,
                                hide: hide
                            });
                            angular.extend(target, defaultColumn, userColumn);
                            columns.push(target);

                            $td.attr('ng-hide', `$columns[${index}].hide`);

                            if (target.checkbox) {
                                return $td.html('<input type="checkbox" ng-model="$row.__checked__" ng-change="$onCheckBoxStateChange($row);" />');
                            }
                            if (target.rownumbers) {
                                return $td.html('{{$index + 1}}');
                            }
                        });
                        return columns;
                    };
                    columns = getColumns($element);
                    $element.prepend('<ourpalm-table-header></ourpalm-table-header>');
                    $element.append('<ourpalm-table-pagination></ourpalm-table-pagination>');
                    $element.append('<ourpalm-table-set-columns></ourpalm-table-set-columns>');
                    return {
                        pre: function ($scope, $element, $attrs, ctl) {
                        }
                    }
                },
                controllerAs: 'vm',
                controller: function ($element, $scope, $attrs) {
                    var vm = this;

                    var onLoadSuccess = function (result) {
                        //拿到结果赋值
                        vm.total = result.total;
                        // vm.rows = $scope.$rows = $scope.$parent.$rows = result.rows;
                        vm.rows = $scope.$rows = result.rows;
                        //赋值后重新计算分页信息方式
                        resetPageInfo();
                    };

                    var resetPageInfo = function () { //计算分页信息
                        //计算总页数
                        vm.allPage = vm.total % vm.pageSize == 0 ? vm.total / vm.pageSize : (parseInt(vm.total / vm.pageSize) + 1);
                        //复选框默认未选中
                        vm.checkBoxModel = false;
                        vm.onCheckBoxChange();
                    };

                    vm.onCheckBoxChange = function () {
                        if (vm.singleSelect) { //如果是单选
                            if (!vm.checkBoxModel) { //如果是取消选中
                                angular.forEach(vm.rows, function (row) {
                                    row.__checked__ = vm.checkBoxModel;
                                });
                            }
                        } else { //如果是多选
                            angular.forEach(vm.rows, function (row) {
                                row.__checked__ = vm.checkBoxModel;
                            });
                        }

                    };
                    vm.changePageSize = function () {
                        vm.currentPage = 1;
                        vm.reload();
                    };
                    vm.gotoFirstPage = function () { //首页
                        vm.currentPage = 1;
                        vm.reload();
                    };
                    vm.gotoPrePage = function () { //上一页
                        vm.currentPage = vm.currentPage - 1;
                        vm.reload();
                    };
                    vm.gotoNextPage = function () { //下一页
                        vm.currentPage = vm.currentPage + 1;
                        vm.reload();
                    };
                    vm.gotoLastPage = function () { //末页
                        vm.currentPage = vm.allPage;
                        vm.reload();
                    };
                    vm.reload = function () { //刷新
                        $timeout(function () {
                            $parse($attrs.ourpalmTable)($scope.$parent, {
                                table: vm,
                                callback: onLoadSuccess
                            });
                        });
                    };
                    vm.sortColumn = function (column, index) {
                        switch (column.sortOrder) {
                            case 'asc':
                                column.sortOrder = 'desc';
                                break;
                            case 'desc':
                                column.sortOrder = 'asc';
                                break;
                            default:
                                column.sortOrder = 'asc';
                                break;
                        }
                        if (vm.serverSort) { //如果是服务器排序，发送请求
                            vm.reload();
                        } else { //客户端排序
                            //简单的字符串排序
                            vm.rows.sort(function (row1, row2) {
                                if (column.sortOrder == 'asc') {
                                    return row1[column.field].localeCompare(row2[column.field]);
                                } else {
                                    return row2[column.field].localeCompare(row1[column.field]);
                                }
                            });
                        }
                    };
                    vm.onCheckBoxStateChange = $scope.$onCheckBoxStateChange = function (row) {
                        if (vm.singleSelect) {
                            angular.forEach(vm.rows, function (row) {
                                row.__checked__ = false;
                            });
                            row.__checked__ = true;
                        }
                    };
                    vm.getSelectedRows = function () {
                        var rows = [];
                        angular.forEach(vm.rows, function (row) {
                            if (row.__checked__)
                                rows.push(row);
                        });
                        return rows;
                    };
                    vm.getSortColumns = function () {
                        var columns = [];
                        angular.forEach(vm.columns, function (col) {
                            if (col.sort)
                                columns.push(col);
                        });
                        return columns;
                    };
                    vm.getShowColumns = function () {
                        var columns = [];
                        angular.forEach(vm.columns, function (col) {
                            if (!col.hide)
                                columns.push(col);
                        });
                    };

                    var defaultOpts = ourpalmTable.options, targetOpts = {}, userOpts = {};
                    $attrs.options && (userOpts = JSON.parse($attrs.options));
                    if ($attrs.pagination != undefined) {
                        userOpts.pagination = $attrs.pagination === 'true' ? true : false;
                    }
                    if ($attrs.singleSelect != undefined) {
                        userOpts.singleSelect = $attrs.singleSelect === 'true' ? true : false;
                    }
                    if ($attrs.pageList != undefined) {
                        userOpts.pageList = JSON.parse($attrs.pageList);
                    }
                    if ($attrs.defaultPageSize != undefined) {
                        userOpts.defaultPageSize = parseInt($attrs.defaultPageSize);
                    }
                    if ($attrs.serverSort != undefined) {
                        userOpts.serverSort = $attrs.serverSort === 'true' ? true : false;
                    }
                    angular.extend(targetOpts, defaultOpts, userOpts);

                    //初始配置
                    vm.checkBoxModel = false; //默认全不选中checkbox
                    vm.pageSize = targetOpts.defaultPageSize; //默认的当前页大小
                    vm.currentPage = 1; //默认为第一页
                    vm.pageList = targetOpts.pageList;
                    vm.total = 0; //默认数据为0条
                    vm.rows = $scope.$rows = [];
                    vm.columns = $scope.$columns = columns;
                    vm.pagination = targetOpts.pagination;
                    vm.serverSort = targetOpts.serverSort;
                    vm.singleSelect = targetOpts.singleSelect;

                    //初始化table页面
                    resetPageInfo();
                    //初始化table完成,首次加载数据
                    vm.reload();
                }
            }
        })

        /**
         * 表头
         * <td table-column="{ 'header': '姓名', 'field': 'name', sort: true, checkbox: true, sortOrder: 'desc' }"></td>
         * <td table-column header="姓名" field="name" sort="true" checkbox="true" sort-order="desc"></td>
         */
        .directive('ourpalmTableHeader', function (ourpalmTable) {
            return {
                restrict: 'AE',
                require: '^ourpalmTable',
                template: `
                    <thead>
                        <tr>
                            <th ng-repeat="col in table.columns" ng-hide="col.hide">
                                <!-- 非 checkbox 列 -->  
                                <span ng-if="col.checkbox == false" class="ourpalm-table-header-sort">
                                    <!-- 非序号列 -->
                                    <span ng-if="col.rownumbers == false">
                                        <!-- 排序列 -->
                                        <span ng-if="col.sort == true"> 
                                            <a href="javascript:void(0);" ng-hide="col.sortOrder" ng-click="table.sortColumn(col, $index);">{{col.header}}</a>
                                            <a href="javascript:void(0);" ng-show="col.sortOrder == 'asc'" ng-click="table.sortColumn(col, $index);">{{col.header}}<i class="fa fa-caret-down"></i></a>
                                            <a href="javascript:void(0);" ng-show="col.sortOrder == 'desc'" ng-click="table.sortColumn(col, $index);">{{col.header}}<i class="fa fa-caret-up"></i></a>
                                        </span>
                                        
                                        <!-- 非排序列 -->
                                        <span ng-if="col.sort == false">
                                            {{col.header}}
                                        </span>
                                    </span>
                                    
                                    <!-- 序号列 -->
                                    <span ng-if="col.rownumbers == true">
                                        {{col.header}}
                                    </span>
                                    
                                </span>
                                
                                <!-- checkbox 列 --> 
                                <span ng-if="col.checkbox == true">
                                    <input type="checkbox" ng-model="table.checkBoxModel" ng-change="table.onCheckBoxChange();">
                                </span>
                            </th>
                        </tr>
                    </thead>
                 `,
                replace: true,
                link: function ($scope, $element, $attrs, table) {
                    $scope.table = table;
                }
            }
        })

        /**
         * 自定义列表项
         */
        .directive('ourpalmTableSetColumns', function (ourpalmTable, $compile) {
            return {
                restrict: 'AE',
                require: '^ourpalmTable',
                template: `
                    <div ng-show="table.setColumns">
                        <div class="ourpalm-mask"></div>
                        <div class="ourpalm-dialog">
                            <div class="modal-dialog">
                                <div class="modal-content modal-center-sm">
                                    <div class="modal-header">
                                        <button type="button" class="close" data-dismiss="modal" ng-click="table.setColumns = false;">
                                            <span aria-hidden="true">×</span>
                                        </button>
                                        <h4 class="modal-title">自定义列表项</h4>
                                    </div>
                                    <div class="modal-body">
                                        <label class="checkbox-inline" ng-repeat="col in table.columns">
                                            <input type="checkbox" ng-model="col.hide">{{col.header}}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                replace: true,
                link: function ($scope, $element, $attrs, table) {
                    $scope.table = table;
                }
            }
        })

        /**
         * 分页插件
         * <td table-column="{ 'header': '姓名', 'field': 'name', sort: true, checkbox: true, sortOrder: 'desc' }"></td>
         * <td table-column header="姓名" field="name" sort="true" checkbox="true" sort-order="desc"></td>
         */
        .directive('ourpalmTablePagination', function (ourpalmTable) {
            return {
                restrict: 'AE',
                template: `
                    <tfoot ng-if="table.pagination">
                        <tr>
                            <td colspan="{{table.columns.length}}">
                                <span style="float:left;">
                                    <select ng-model="table.pageSize" class="form-control input-sm" ng-options="pageSize for pageSize in table.pageList" ng-change="table.changePageSize();" class="form-control input-sm" style="height:20px;line-height:20px;padding:0;margin-top:-2px;max-width:50px;display:inline-block;"></select>
                                    <button class="ourpalm-table-pager" ng-disabled="table.currentPage == 1" ng-click="table.gotoFirstPage();"><i class="fa fa-step-backward"></i></button><!--首页-->
                                    <button class="ourpalm-table-pager" ng-disabled="table.currentPage == 1" ng-click="table.gotoPrePage();"><i class="fa fa-backward"></i></button><!-- 上一页-->
                                    第
                                    <input type="text" value="{{table.currentPage}}" class="form-control input-sm" style="height:20px;line-height:20px;padding:0;margin-top:-2px;max-width:34px;display:inline-block;">
                                    页,共{{table.allPage}}页
                                    <button class="ourpalm-table-pager" ng-disabled="table.currentPage == table.allPage" ng-click="table.gotoNextPage();"><i class="fa fa-forward"></i></button><!-- 下一页-->
                                    <button class="ourpalm-table-pager" ng-disabled="table.currentPage == table.allPage" ng-click="table.gotoLastPage();"><i class="fa fa-step-forward"></i></button><!-- 尾页-->
                                    <button class="ourpalm-table-pager" ng-click="table.reload();"><i class="fa fa-refresh"></i></button><!--刷新-->
                                    <button class="ourpalm-table-pager" ng-click="table.setColumns = true;"><i class="fa fa-gear"></i></button><!--自定义列表项-->
                                </span>
                                <span style="float:right;">显示{{(table.currentPage - 1) * table.pageSize + 1}} / {{(table.currentPage * table.pageSize > table.total ? table.total : (table.currentPage * table.pageSize))}}条记录 ，共{{table.total}}条记录</span>
                            </td>
                        </tr>
                    </tfoot>
                `,
                replace: true,
                require: '^ourpalmTable',
                link: function ($scope, $element, $attrs, table) {
                    $scope.table = table;
                }
            }
        })

})(angular);