(function (angular, $) {

    Array.prototype.copy = function (start, end) {
        return [].concat(this).slice(start, end);
    };

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
                serverPage: true, //服务器分页
                pagination: true, //如果为true，则在控件底部显示分页工具栏
                singleSelect: false, //如果为true，则只允许选择一行
                pageList: [10, 20, 30, 40, 50], //在设置分页属性的时候 初始化页面大小选择列表
                defaultPageSize: 10, //默认的分页大小
                skipPage: true //是否允许分页控件中跳转页
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

        .factory('OurpalmTable', function ($timeout) {
            function OurpalmTable(opts) {
                var table = this;

                //当前页的信息
                var context = {
                    allBoxChecked: false, //默认checkbox不选中
                    pageSize: 10, //默认每页加载10条
                    currentPage: 1, //默认加载第一页
                    pageList: [10, 20, 30, 50, 100], //默认分页信息
                    total: 0, //总共有几条数据
                    rows: [], //当页显示的数据
                    columns: [], //列的配置信息
                    pagination: true, //是否启用分页
                    serverPage: true, //是否服务器分页
                    serverSort: true, //是否服务器排序
                    singleSelect: false, //是否只能选中一行
                    skipPage: true, //是否可以跳转页面
                    allPage: 1 //总共有几页
                };

                var __listeners = [];

                /* 共有方法 public */

                /**
                 * 获取配置信息
                 */
                table.getOptions = function () {
                    return {
                        currentPage: context.currentPage,
                        pageSize: context.pageSize
                    };
                };

                /**
                 * 获取当前选中的所有行
                 */
                table.getSelectedRows = function () {
                    var rows = [];
                    angular.forEach(context.rows, function (row) {
                        if (row.__checked__)
                            rows.push(row);
                    });
                    return rows;
                };

                /**
                 * 获取本页所有行
                 */
                table.getDisplayedRows = function () {
                    return rows;
                };

                /**
                 * 获取当前排序的列信息
                 */
                table.getSortColumns = function () {
                    var columns = [];
                    angular.forEach(context.columns, function (col) {
                        if (col.sort)
                            columns.push(col);
                    });
                    return columns;
                };

                /**
                 * 获取当前显示的列信息
                 */
                table.getDisplayedColumns = function () {
                    var columns = [];
                    angular.forEach(context.columns, function (col) {
                        if (!col.hide)
                            columns.push(col);
                    });
                };


                /* 私有方法 private */

                var __setOptions = function (defaultOpts, pageOptions) {
                    angular.extend(context, defaultOpts, pageOptions, opts);
                };

                var initPage = function () {
                    context.currentPage = 1;
                    context.pageSize = context.defaultPageSize || context.pageList[0];
                    __loadData();
                };

                var __loadData = function () {
                    if (context.serverPage) { //服务器加载数据
                        context.loadData && context.loadData(table, __onServerDataLoadSuccess);
                    } else { //页面初始化数据
                        __onMemoryDataLoadSuccess();
                    }
                };

                /**
                 * 内存加载数据回调处理
                 */
                var __onMemoryDataLoadSuccess = function () {
                    context.total = context.data.length;
                    var start = (context.currentPage - 1) * context.pageSize;
                    var end = (start + context.pageSize) > context.total ? context.total : (start + context.pageSize);
                    context.rows = context.data.copy(start, end);
                    context.allPage = context.total % context.pageSize == 0 ? context.total / context.pageSize : (parseInt(context.total / context.pageSize + 1));
                    //复选框默认未选中
                    context.allBoxChecked = false;
                    onHeaderCheckBoxChange();

                    for (var i = 0; i < __listeners.length; i++) {
                        __listeners[i]();
                    }
                };

                /**
                 * 服务器加载数据回调处理
                 */
                var __onServerDataLoadSuccess = function (result) {
                    context.total = result.total;
                    context.rows = result.rows;
                    context.allPage = context.total % context.pageSize == 0 ? context.total / context.pageSize : (parseInt(context.total / context.pageSize + 1));
                    //复选框默认未选中
                    context.allBoxChecked = false;
                    onHeaderCheckBoxChange();

                    for (var i = 0; i < __listeners.length; i++) {
                        __listeners[i]();
                    }
                };

                var registerDataChangeListener = function (callback) {
                    __listeners.push(callback);
                };

                /* 内部使用方法 protected */

                var onHeaderCheckBoxChange = function () {
                    if (context.singleSelect) { //如果是单选
                        if (!context.allBoxChecked) { //如果是取消选中
                            angular.forEach(context.rows, function (row) {
                                row.__checked__ = context.allBoxChecked;
                            });
                        }
                    } else { //如果是多选
                        angular.forEach(context.rows, function (row) {
                            row.__checked__ = context.allBoxChecked;
                        });
                    }
                };

                var onRowCheckBoxChange = function (row) {
                    if (context.singleSelect) {
                        angular.forEach(context.rows, function (row) {
                            row.__checked__ = false;
                        });
                        row.__checked__ = true;
                    }
                };

                var gotoFirstPage = function () {
                    context.currentPage = 1;
                    __loadData();
                };

                var gotoPrePage = function () {
                    context.currentPage = context.currentPage - 1;
                    __loadData();
                };

                var gotoNextPage = function () {
                    context.currentPage = context.currentPage + 1;
                    __loadData();
                };

                var gotoLastPage = function () {
                    context.currentPage = context.allPage;
                    __loadData();
                };

                var gotoSkipPage = function (event) {
                    var keyCode = window.event ? event.keyCode : event.which;
                    if (keyCode != 13) return;

                    var value = event.currentTarget.value;
                    if (value && context.skipPage) {
                        value = parseInt(value);
                        if (value >= 1 && value <= context.allPage) {
                            context.currentPage = value;
                            __loadData();
                        }
                    }
                };

                var sortColumn = function (column, index) {
                    console.info(arguments);
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
                    if (context.serverSort) { //如果是服务器排序，发送请求
                        __loadData();
                    } else { //客户端排序
                        //简单的字符串排序
                        context.rows.sort(function (row1, row2) {
                            if (column.sortOrder == 'asc') {
                                return (row1[column.field] + '').localeCompare((row2[column.field] + ''));
                            } else {
                                return (row2[column.field] + '').localeCompare((row1[column.field] + ''));
                            }
                        });
                    }
                };

                var setColumns = function (columns) {
                    context.columns = columns;
                };

                table.__table__ = function () {
                    return function (defaultOpts, pageOptions) {
                        __setOptions(defaultOpts, pageOptions);

                        return {
                            onHeaderCheckBoxChange: onHeaderCheckBoxChange,
                            onRowCheckBoxChange: onRowCheckBoxChange,
                            gotoFirstPage: gotoFirstPage,
                            gotoPrePage: gotoPrePage,
                            gotoNextPage: gotoNextPage,
                            gotoLastPage: gotoLastPage,
                            gotoSkipPage: gotoSkipPage,
                            sortColumn: sortColumn,
                            setColumns: setColumns,
                            registerDataChangeListener: registerDataChangeListener,
                            initPage: initPage,
                            context: context
                        }
                    }
                };
            }

            return OurpalmTable;
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
                                return $td.html('<input type="checkbox" ng-model="$row.__checked__" ng-change="$onRowCheckBoxChange($row);" />');
                            }
                            if (target.rownumbers) {
                                return $td.html('{{$index + 1}}');
                            }
                        });
                        return columns;
                    };
                    columns = getColumns($element);
                    $element.prepend('<ourpalm-table-header table="vm.table"></ourpalm-table-header>');
                    $element.append('<ourpalm-table-pagination table="vm.table"></ourpalm-table-pagination>');
                    $element.append('<ourpalm-table-set-columns table="vm.table"></ourpalm-table-set-columns>');
                    return {
                        pre: function ($scope, $element, $attrs, ctl) {
                        }
                    }
                },
                controllerAs: 'vm',
                controller: function ($element, $scope, $attrs) {
                    var vm = this;

                    function parseAttrs(pageOptions, attr, callback) {
                        var value = $parse($attrs[attr])($scope.$parent);
                        if (value != undefined) {
                            if (callback) callback(value);
                            else pageOptions[attr] = value;
                        }
                    }

                    var defaultOpts = ourpalmTable.options, pageOptions = {};
                    parseAttrs(pageOptions, 'options', function (value) {
                        angular.extend(pageOptions, value);
                    });
                    parseAttrs(pageOptions, 'pagination');
                    parseAttrs(pageOptions, 'singleSelect');
                    parseAttrs(pageOptions, 'serverSort');
                    parseAttrs(pageOptions, 'pageList');
                    parseAttrs(pageOptions, 'defaultPageSize');
                    parseAttrs(pageOptions, 'skipPage');
                    parseAttrs(pageOptions, 'serverPage');

                    var table = $parse($attrs.ourpalmTable)($scope.$parent); //获取table的共有方法
                    vm.table = table.__table__()(defaultOpts, pageOptions); //获取table的私有方法
                    vm.table.setColumns(columns);
                    vm.table.registerDataChangeListener(function () {
                        $timeout(function () {
                            $scope.$rows = vm.table.context.rows;
                        });
                    });
                    $scope.$onRowCheckBoxChange = vm.table.onRowCheckBoxChange;
                    $scope.$columns = columns;
                    vm.table.initPage();
                }
            }
        })

        /**
         * 表头
         * <td table-column="{ 'header': '姓名', 'field': 'name', sort: true, checkbox: true, sortOrder: 'desc' }"></td>
         * <td table-column header="姓名" field="name" sort="true" checkbox="true" sort-order="desc"></td>
         */
        .directive('ourpalmTableHeader', function () {
            return {
                restrict: 'AE',
                scope: {
                    table: '='
                },
                template: `
                    <thead>
                        <tr>
                            <th ng-repeat="col in table.context.columns" ng-hide="col.hide">
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
                                    <input type="checkbox" ng-model="table.context.allBoxChecked" ng-change="table.onHeaderCheckBoxChange();">
                                </span>
                            </th>
                        </tr>
                    </thead>
                 `,
                replace: true
            }
        })

        /**
         * 自定义列表项
         */
        .directive('ourpalmTableSetColumns', function () {
            return {
                restrict: 'AE',
                scope: {
                    table: '='
                },
                template: `
                    <div ng-show="table.context.setColumns">
                        <div class="ourpalm-mask"></div>
                        <div class="ourpalm-dialog">
                            <div class="modal-dialog">
                                <div class="modal-content modal-center-sm">
                                    <div class="modal-header">
                                        <button type="button" class="close" data-dismiss="modal" ng-click="table.context.setColumns = false;">
                                            <span aria-hidden="true">×</span>
                                        </button>
                                        <h4 class="modal-title">自定义列表项</h4>
                                    </div>
                                    <div class="modal-body">
                                        <label class="checkbox-inline" ng-repeat="col in table.context.columns">
                                            <input type="checkbox" ng-model="col.hide">{{col.header}}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                replace: true
            }
        })

        /**
         * 分页插件
         * <td table-column="{ 'header': '姓名', 'field': 'name', sort: true, checkbox: true, sortOrder: 'desc' }"></td>
         * <td table-column header="姓名" field="name" sort="true" checkbox="true" sort-order="desc"></td>
         */
        .directive('ourpalmTablePagination', function () {
            return {
                restrict: 'AE',
                scope: {
                    table: '='
                },
                template: `
                    <tfoot>
                        <tr ng-if="table.context.pagination">
                            <td colspan="{{table.context.columns.length}}">
                                <span style="float:left;">
                                    <select ng-model="table.context.pageSize" class="form-control input-sm" ng-options="pageSize for pageSize in table.context.pageList" ng-change="table.changePageSize();" class="form-control input-sm" style="height:20px;line-height:20px;padding:0;margin-top:-2px;max-width:50px;display:inline-block;"></select>
                                    <button class="ourpalm-table-pager" ng-disabled="table.context.currentPage == 1" ng-click="table.gotoFirstPage();"><i class="fa fa-step-backward"></i></button><!--首页-->
                                    <button class="ourpalm-table-pager" ng-disabled="table.context.currentPage == 1" ng-click="table.gotoPrePage();"><i class="fa fa-backward"></i></button><!-- 上一页-->
                                    第
                                    <input type="number" ng-model="pagination.currPage" ng-keyup="table.gotoSkipPage($event);" ng-readonly="!table.context.skipPage" min="1" max="{{table.context.allPage}}" class="form-control input-sm" style="height:20px;line-height:20px;padding:0;margin-top:-2px;max-width:34px;display:inline-block;">
                                    页,共{{table.context.allPage}}页
                                    <button class="ourpalm-table-pager" ng-disabled="table.context.currentPage == table.context.allPage" ng-click="table.gotoNextPage();"><i class="fa fa-forward"></i></button><!-- 下一页-->
                                    <button class="ourpalm-table-pager" ng-disabled="table.context.currentPage == table.context.allPage" ng-click="table.gotoLastPage();"><i class="fa fa-step-forward"></i></button><!-- 尾页-->
                                    <button class="ourpalm-table-pager" ng-click="table.reload();"><i class="fa fa-refresh"></i></button><!--刷新-->
                                    <button class="ourpalm-table-pager" ng-click="table.context.setColumns = true;"><i class="fa fa-gear"></i></button><!--自定义列表项-->
                                </span>
                                <span style="float:right;">显示{{(table.context.currentPage - 1) * table.context.pageSize + 1}} / {{(table.context.currentPage * table.context.pageSize > table.context.total ? table.context.total : (table.context.currentPage * table.context.pageSize))}}条记录 ，共{{table.context.total}}条记录</span>
                            </td>
                        </tr>
                    </tfoot>
                `,
                replace: true,
                link: function ($scope, $element, $attrs, table) {
                    $scope.$watch(function () {
                        return $scope.table.context.currentPage;
                    }, function (newValue) {
                        $scope.currPage = newValue;
                    })
                },
                controllerAs: 'pagination',
                controller: function ($scope) {
                    var vm = this;
                    $scope.$watch(function () {
                        return $scope.table.context.currentPage;
                    }, function (newValue) {
                        vm.currPage = newValue;
                    });
                }
            }
        })

})(angular, jQuery);